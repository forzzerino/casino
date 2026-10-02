/**
 * Turns bet state into physical chips. It diffs the desired bets of every owner
 * (player + bots) against what is on the felt and animates the difference:
 *
 *  - new / increased bet → a chip of the added value flies in and merges into a
 *    single consolidated chip showing the new total
 *  - reduced / removed bet (undo, clear) → the stack updates or returns to its owner
 *  - result → winners glow, losers dim; payout → losers swept, winners paid & collected
 *
 * Game logic never touches this class; it only reads state.
 */
import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { PAYOUT_RATIOS } from '../../game/betting/betSpots';
import { gameEvents } from '../../game/events';
import type { BetMap, BetSpot } from '../../types/game';
import { Ease } from '../../utils/easing';
import { arcTo, moveTo, pop, scaleTo } from '../animations/objectAnimations';
import type { Tweens } from '../animations/Tweens';
import { WORLD } from '../sceneLayout';
import { CHIP_HEIGHT, CHIP_RADIUS, type ChipFactory, type ChipLook } from './ChipFactory';
import type { LayoutSurface } from './LayoutSurface';

export interface ChipOwner {
  readonly ownerId: string;
  readonly bets: BetMap;
  /** Where this owner's chips fly from and return to. */
  readonly origin: Vector3;
  readonly lookFor: (amount: number) => ChipLook;
  /** Lateral nudge when this owner's chip sits on top of someone else's. */
  readonly stackOffset: { readonly x: number; readonly z: number };
}

interface StackVisual {
  readonly key: string;
  owner: ChipOwner;
  readonly spot: BetSpot;
  readonly order: number;
  /** Latest amount from state. */
  target: number;
  /** Amount currently printed on the chip (lags while chips are in flight). */
  displayed: number;
  readonly group: Group;
  readonly chip: Mesh;
  readonly flights: Set<Mesh>;
  winRing: Mesh | null;
}

const FLIGHT = { duration: 0.46, height: 0.13, spin: 2.4 } as const;
/** Seconds into PAYOUT — timed so the camera is arriving back at the table. */
const PAYOUT_TIMELINE = { sweepAt: 1.0, payAt: 1.45, payStagger: 0.14, collectAt: 2.9 } as const;

let orderCounter = 0;

export class ChipManager {
  readonly group = new Group();
  private readonly visuals = new Map<string, StackVisual>();
  private frozen = false;
  private readonly ringGeometry: RingGeometry;
  private readonly ringMaterial: MeshBasicMaterial;

  constructor(
    private readonly factory: ChipFactory,
    private readonly layout: LayoutSurface,
    private readonly tweens: Tweens,
  ) {
    this.group.name = 'chips';
    this.ringGeometry = new RingGeometry(CHIP_RADIUS + 0.0015, CHIP_RADIUS + 0.0095, 48);
    this.ringGeometry.rotateX(-Math.PI / 2);
    this.ringMaterial = new MeshBasicMaterial({
      color: new Color('#f0cd84'),
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }

  /** Reconciles the felt with the bets in state. Ignored while a round is being settled. */
  sync(owners: readonly ChipOwner[]): void {
    if (this.frozen) return;
    const desired = new Map<string, { owner: ChipOwner; spot: BetSpot; amount: number }>();
    for (const owner of owners) {
      for (const bet of Object.values(owner.bets)) {
        desired.set(`${owner.ownerId}|${bet.key}`, { owner, spot: bet, amount: bet.amount });
      }
    }

    for (const visual of [...this.visuals.values()]) {
      const want = desired.get(visual.key);
      if (!want) this.returnToOwner(visual);
      else {
        visual.owner = want.owner;
        if (want.amount < visual.target) this.reduce(visual, want.amount);
      }
    }
    const additions: [StackVisual, number][] = [];
    for (const [key, want] of desired) {
      const visual = this.visuals.get(key) ?? this.create(key, want.owner, want.spot);
      if (want.amount > visual.target) additions.push([visual, want.amount - visual.target]);
    }
    // Place stacks first so incoming chips know where to land.
    this.restack(true);
    for (const [visual, delta] of additions) this.addTo(visual, delta);
  }

  private create(key: string, owner: ChipOwner, spot: BetSpot): StackVisual {
    const group = new Group();
    const chip = this.factory.create(owner.lookFor(1));
    chip.position.y = CHIP_HEIGHT / 2;
    chip.rotation.y = (Math.random() - 0.5) * 0.5;
    chip.visible = false;
    group.add(chip);
    this.group.add(group);
    const visual: StackVisual = {
      key,
      owner,
      spot,
      order: ++orderCounter,
      target: 0,
      displayed: 0,
      group,
      chip,
      flights: new Set(),
      winRing: null,
    };
    this.visuals.set(key, visual);
    return visual;
  }

  private addTo(visual: StackVisual, delta: number): void {
    visual.target += delta;
    const flight = this.factory.create(visual.owner.lookFor(delta));
    flight.position.copy(visual.owner.origin);
    flight.rotation.y = Math.random() * Math.PI;
    flight.scale.setScalar(0.4);
    this.group.add(flight);
    visual.flights.add(flight);
    void scaleTo(this.tweens, flight, 1, { duration: 0.22, ease: Ease.outCubic, tag: visual });

    const stacked = visual.displayed > 0 || visual.flights.size > 1;
    const landing = visual.group.position.clone();
    landing.y += stacked ? CHIP_HEIGHT * 1.5 : CHIP_HEIGHT / 2;

    void arcTo(this.tweens, flight, landing, {
      duration: FLIGHT.duration,
      height: FLIGHT.height,
      spin: FLIGHT.spin,
      tag: visual,
      ease: Ease.inOutQuad,
      onLand: () => {
        gameEvents.emit('chipLanded', { ownerId: visual.owner.ownerId, intensity: 1 });
        const merge = () => {
          if (!visual.flights.delete(flight)) return;
          this.group.remove(flight);
          visual.displayed = Math.min(visual.displayed + delta, visual.target);
          this.showAmount(visual, true);
        };
        if (!stacked) {
          merge();
          return;
        }
        // The new chip sinks into the stack, which then shows the consolidated total.
        void moveTo(this.tweens, flight, landing.clone().setY(landing.y - CHIP_HEIGHT), {
          duration: 0.12,
          ease: Ease.inQuad,
          tag: visual,
          onComplete: merge,
        });
      },
    });
  }

  private reduce(visual: StackVisual, amount: number): void {
    this.dropFlights(visual);
    visual.target = amount;
    visual.displayed = amount;
    this.showAmount(visual, true);
  }

  private showAmount(visual: StackVisual, animate: boolean): void {
    if (visual.displayed <= 0) return;
    this.factory.setLook(visual.chip, visual.owner.lookFor(visual.displayed));
    visual.chip.visible = true;
    if (animate) void pop(this.tweens, visual.chip, { tag: visual });
  }

  private dropFlights(visual: StackVisual): void {
    this.tweens.cancelTag(visual);
    visual.flights.forEach((flight) => this.group.remove(flight));
    visual.flights.clear();
    visual.chip.scale.set(1, 1, 1);
  }

  private detach(visual: StackVisual): void {
    this.visuals.delete(visual.key);
    this.dropFlights(visual);
  }

  private returnToOwner(visual: StackVisual): void {
    this.detach(visual);
    void arcTo(this.tweens, visual.group, visual.owner.origin, {
      duration: 0.42,
      height: 0.08,
      tag: visual,
      onLand: () => this.group.remove(visual.group),
    });
    void scaleTo(this.tweens, visual.group, 0.55, { duration: 0.42, tag: visual.group });
  }

  /** Chips sharing a spot stack on top of one another in the order they arrived. */
  private restack(animate: boolean): void {
    const bySpot = new Map<string, StackVisual[]>();
    for (const visual of this.visuals.values()) {
      const list = bySpot.get(visual.spot.key) ?? [];
      list.push(visual);
      bySpot.set(visual.spot.key, list);
    }
    const anchor = new Vector3();
    for (const list of bySpot.values()) {
      list.sort((a, b) => a.order - b.order);
      list.forEach((visual, level) => {
        this.layout.anchorWorld(visual.spot, 0, anchor);
        if (level > 0) {
          anchor.x += visual.owner.stackOffset.x;
          anchor.z += visual.owner.stackOffset.z;
          anchor.y += level * CHIP_HEIGHT * 1.02;
        }
        if (visual.group.position.distanceToSquared(anchor) < 1e-10) return;
        if (animate && visual.displayed > 0) {
          void moveTo(this.tweens, visual.group, anchor.clone(), { duration: 0.2, tag: visual.group });
        } else {
          visual.group.position.copy(anchor);
        }
      });
    }
  }

  /** RESULT: emphasise winning stacks, de-emphasise losing ones. */
  markOutcome(result: number): void {
    this.frozen = true;
    for (const visual of this.visuals.values()) {
      this.dropFlights(visual);
      visual.displayed = visual.target;
      this.showAmount(visual, false);
      const look = visual.owner.lookFor(visual.displayed);
      if (visual.spot.numbers.includes(result)) {
        const ring = new Mesh(this.ringGeometry, this.ringMaterial);
        ring.position.y = 0.0016;
        ring.renderOrder = 5;
        visual.group.add(ring);
        visual.winRing = ring;
        void pop(this.tweens, visual.chip, { amount: 0.22, duration: 0.45, tag: visual });
      } else {
        this.factory.setLook(visual.chip, look, 'dimmed');
      }
    }
  }

  /** PAYOUT: sweep losers to the croupier, pay winners from the float, then collect. */
  playPayout(result: number): void {
    this.frozen = true;
    const winners: StackVisual[] = [];
    const losers: StackVisual[] = [];
    for (const visual of this.visuals.values()) {
      (visual.spot.numbers.includes(result) ? winners : losers).push(visual);
    }
    this.visuals.clear();

    losers.forEach((visual, i) => {
      const spread = new Vector3((Math.random() - 0.5) * 0.3, CHIP_HEIGHT, (Math.random() - 0.5) * 0.05);
      void arcTo(this.tweens, visual.group, WORLD.dealerRack.clone().add(spread), {
        duration: 0.55,
        height: 0.035,
        delay: PAYOUT_TIMELINE.sweepAt + i * 0.035,
        tag: visual,
        onLand: () => this.group.remove(visual.group),
      });
      void scaleTo(this.tweens, visual.group, 0.4, {
        duration: 0.25,
        delay: PAYOUT_TIMELINE.sweepAt + i * 0.035 + 0.3,
        tag: visual.group,
      });
    });

    const lastPayLanding =
      PAYOUT_TIMELINE.payAt + Math.max(0, winners.length - 1) * PAYOUT_TIMELINE.payStagger + 0.55;
    const collectAt = Math.max(PAYOUT_TIMELINE.collectAt, lastPayLanding + 0.25);

    winners.forEach((visual, i) => {
      const winnings = visual.target * PAYOUT_RATIOS[visual.spot.type];
      const payout = this.factory.create(visual.owner.lookFor(winnings));
      payout.position.copy(WORLD.dealerChipOrigin);
      this.group.add(payout);
      const landing = visual.group.position.clone();
      landing.y += CHIP_HEIGHT * 1.5;
      landing.x += 0.002;
      void arcTo(this.tweens, payout, landing, {
        duration: 0.55,
        height: 0.12,
        spin: 3,
        delay: PAYOUT_TIMELINE.payAt + i * PAYOUT_TIMELINE.payStagger,
        tag: visual,
        onLand: () => {
          gameEvents.emit('chipLanded', { ownerId: visual.owner.ownerId, intensity: 0.8 });
          visual.group.attach(payout);
        },
      });
      void arcTo(this.tweens, visual.group, visual.owner.origin, {
        duration: 0.55,
        height: 0.1,
        delay: collectAt + i * 0.05,
        tag: visual.group,
        onLand: () => this.group.remove(visual.group),
      });
      void scaleTo(this.tweens, visual.group, 0.55, { duration: 0.3, delay: collectAt + i * 0.05 + 0.25, tag: visual });
    });
  }

  /** New betting round: anything still on the felt is removed and syncing resumes. */
  reset(): void {
    for (const visual of this.visuals.values()) this.dropFlights(visual);
    this.visuals.clear();
    this.group.clear();
    this.frozen = false;
  }

  update(time: number): void {
    this.ringMaterial.opacity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(time * 4.2));
  }

  dispose(): void {
    this.reset();
    this.ringGeometry.dispose();
    this.ringMaterial.dispose();
  }
}
