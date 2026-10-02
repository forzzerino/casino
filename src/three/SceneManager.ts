/**
 * Owns the WebGL renderer and the 3D world, and bridges store state into it.
 * The 3D layer is a pure consumer: it reads state, plays animations and reports
 * pointer intents back through store actions.
 */
import {
  ACESFilmicToneMapping,
  Color,
  FogExp2,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { botChipPalette, chipPaletteForAmount } from '../config/chipPalettes';
import { GAME_CONFIG } from '../config/gameConfig';
import { numberRect, rectCenter } from '../game/betting/layout';
import { gameClock } from '../game/clock';
import { gameEvents } from '../game/events';
import { wheelAngleAt } from '../game/roulette/wheelMotion';
import { createTranslator } from '../i18n';
import type { GameState, GameStoreApi } from '../state/gameStore';
import { GamePhase, PLAYER_ID } from '../types/game';
import { Ease } from '../utils/easing';
import { formatChipLabel } from '../utils/format';
import { Tweens } from './animations/Tweens';
import { BetPicker } from './betting/BetPicker';
import { ChipFactory, type ChipLook } from './betting/ChipFactory';
import { ChipManager, type ChipOwner } from './betting/ChipManager';
import { LayoutSurface } from './betting/LayoutSurface';
import { BallCam } from './camera/BallCam';
import { CameraChoreographer } from './camera/CameraChoreographer';
import { CameraDirector } from './camera/CameraDirector';
import { shotForMode } from './camera/cameraShots';
import { Lighting } from './lighting/Lighting';
import { createMaterialLibrary, type MaterialLibrary } from './materials';
import { Chairs } from './objects/Chairs';
import { DealerRack } from './objects/DealerRack';
import { Lamp } from './objects/Lamp';
import { LimitsPlacard } from './objects/LimitsPlacard';
import { Table } from './objects/Table';
import { WinMarker } from './objects/WinMarker';
import { BallController } from './roulette/BallController';
import { RouletteWheel } from './roulette/RouletteWheel';
import { CasinoEnvironment } from './scene/Environment';
import { BOT_SEATS, WORLD } from './sceneLayout';
import { createGlowTexture } from './textures/surfaceTextures';

const BOT_STACK_OFFSETS = [
  { x: -0.005, z: 0.004 },
  { x: 0.005, z: 0.004 },
  { x: 0.006, z: -0.002 },
  { x: 0.004, z: -0.005 },
  { x: -0.004, z: -0.005 },
] as const;

interface Disposable {
  dispose(): void;
}

export class SceneManager {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(42, 16 / 9, 0.05, 60);
  private readonly tweens = new Tweens();
  private readonly materials: MaterialLibrary;
  private readonly glow: Texture;
  private readonly chipFactory = new ChipFactory();
  private readonly wheel: RouletteWheel;
  private readonly ball: BallController;
  private readonly layout: LayoutSurface;
  private readonly chips: ChipManager;
  private readonly marker: WinMarker;
  private readonly placard: LimitsPlacard;
  private readonly director: CameraDirector;
  private readonly ballCam = new BallCam();
  private readonly choreographer: CameraChoreographer;
  private readonly picker: BetPicker;
  private readonly disposables: Disposable[] = [];
  private readonly unsubscribers: (() => void)[] = [];
  private readonly resizeObserver: ResizeObserver;
  private readonly lookCache = new Map<string, (amount: number) => ChipLook>();
  private readonly ballWorld = new Vector3();
  private environmentMap: Texture | null = null;
  private frameHandle = 0;
  /** Real time drives only the camera; everything on the table follows the game clock. */
  private lastRealTime = performance.now();
  private lastGameTime = gameClock.now();
  private gameElapsed = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly store: GameStoreApi,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.domElement.className = 'casino-canvas__surface';
    container.appendChild(this.renderer.domElement);

    this.scene.background = new Color('#070605');
    this.scene.fog = new FogExp2('#0a0807', 0.07);
    this.setupEnvironmentMap();

    this.materials = createMaterialLibrary();
    this.glow = createGlowTexture();

    const environment = new CasinoEnvironment(this.materials, this.glow);
    const lighting = new Lighting();
    const table = new Table(this.materials);
    const chairs = new Chairs(this.materials);
    const lamp = new Lamp(this.materials, this.glow);
    const rack = new DealerRack(this.materials, this.chipFactory);
    this.wheel = new RouletteWheel(this.materials);
    this.ball = new BallController(this.wheel);
    this.layout = new LayoutSurface(this.chipFactory);
    this.chips = new ChipManager(this.chipFactory, this.layout, this.tweens);
    this.marker = new WinMarker(this.materials, this.tweens);
    this.placard = new LimitsPlacard(this.materials);

    for (const part of [environment, lighting, table, chairs, lamp, rack, this.wheel, this.layout, this.chips, this.marker, this.placard]) {
      this.scene.add(part.group);
      this.disposables.push(part);
    }

    this.director = new CameraDirector(this.camera);
    this.director.setDynamicShot('BALL', () => this.ballCam.pose);
    this.choreographer = new CameraChoreographer(store, this.director);
    this.picker = new BetPicker(this.renderer.domElement, this.camera, this.layout, {
      hover: (spot, x, y) => {
        store.getState().setHoveredSpot(spot);
        gameEvents.emit('layoutHover', { spot, x, y });
      },
      select: (spot) => {
        store.getState().selectSpot(spot);
        gameEvents.emit('uiClick', { variant: 'soft' });
      },
      activate: (spot) => store.getState().placeBetOn(spot),
    });

    this.subscribe();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.frameHandle = requestAnimationFrame(this.frame);
    if (import.meta.env.DEV) this.exposeDebugHelpers();
  }

  /** Dev builds only: lets automated checks click exact layout spots through the real raycast path. */
  private exposeDebugHelpers(): void {
    const project = (world: Vector3) => {
      const ndc = world.clone().project(this.camera);
      const rect = this.renderer.domElement.getBoundingClientRect();
      return { x: rect.left + ((ndc.x + 1) / 2) * rect.width, y: rect.top + ((1 - ndc.y) / 2) * rect.height };
    };
    (window as unknown as { rouletteScene: unknown }).rouletteScene = {
      projectLayout: (x: number, y: number) => project(this.layout.layoutToWorld({ x, y })),
      projectBall: () => project(this.wheel.ballWorldPosition(new Vector3())),
      cameraPosition: () => this.camera.position.toArray(),
      shot: () => this.director.shotId,
    };
  }

  private setupEnvironmentMap(): void {
    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentMap = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.environmentMap;
    this.scene.environmentIntensity = 0.3;
    room.dispose();
    pmrem.dispose();
  }

  private subscribe(): void {
    const s = this.store;
    const add = (off: () => void) => this.unsubscribers.push(off);

    add(
      s.subscribe(
        (state) => state.language,
        (language) => {
          const t = createTranslator(language);
          this.layout.draw(t);
          this.placard.draw(t);
        },
        { fireImmediately: true },
      ),
    );
    // Fire immediately so a scene created mid-round (late fonts, hot reload) picks up the current state.
    add(s.subscribe((state) => state.gamePhase, (phase) => this.onPhase(phase), { fireImmediately: true }));
    add(s.subscribe((state) => state.paused, () => this.updateInteractivity()));
    add(s.subscribe((state) => state.currentBets, () => this.syncChips()));
    add(s.subscribe((state) => state.bots, () => this.syncChips()));
    add(s.subscribe((state) => state.hoveredSpot, () => this.updateHover()));
    add(s.subscribe((state) => state.selectedChip, () => this.updateHover()));
    add(s.subscribe((state) => state.selectedSpot, (spot) => this.layout.setSelected(spot), { fireImmediately: true }));
    add(s.subscribe((state) => state.neighboursPreview, (numbers) => this.layout.setPreview(numbers)));
    add(s.subscribe((state) => state.cameraMode, (mode) => this.choreographer.onModeChange(mode)));
    add(
      s.subscribe(
        (state) => state.hasEntered,
        (entered) => {
          if (entered) this.director.goTo(shotForMode(s.getState().cameraMode), 3.6, Ease.inOutCubic);
        },
        { fireImmediately: true },
      ),
    );
  }

  private lookFor(ownerId: string, botColor?: string): (amount: number) => ChipLook {
    const cached = this.lookCache.get(ownerId);
    if (cached) return cached;
    const denominations = GAME_CONFIG.chipDenominations;
    const look = botColor
      ? (amount: number): ChipLook => ({
          palette: botChipPalette(botColor),
          label: formatChipLabel(amount),
          pattern: 'wheel',
        })
      : (amount: number): ChipLook => ({
          palette: chipPaletteForAmount(amount, denominations),
          label: formatChipLabel(amount),
          pattern: 'casino',
        });
    this.lookCache.set(ownerId, look);
    return look;
  }

  private syncChips(): void {
    const state = this.store.getState();
    const owners: ChipOwner[] = [
      {
        ownerId: PLAYER_ID,
        bets: state.currentBets,
        origin: WORLD.playerChipOrigin,
        lookFor: this.lookFor(PLAYER_ID),
        stackOffset: { x: 0.003, z: 0.004 },
      },
      ...state.bots.map((bot) => ({
        ownerId: bot.id,
        bets: bot.bets,
        origin: BOT_SEATS[bot.seat % BOT_SEATS.length].chipOrigin,
        lookFor: this.lookFor(bot.id, bot.color),
        stackOffset: BOT_STACK_OFFSETS[bot.seat % BOT_STACK_OFFSETS.length],
      })),
    ];
    this.chips.sync(owners);
  }

  private updateHover(): void {
    const { hoveredSpot, selectedChip, gamePhase } = this.store.getState();
    const active = gamePhase === GamePhase.BETTING ? hoveredSpot : null;
    this.layout.setHover(active, active ? this.lookFor(PLAYER_ID)(selectedChip) : null);
  }

  /** The felt only takes input while betting is open and the game isn't paused. */
  private updateInteractivity(): void {
    const { gamePhase, paused } = this.store.getState();
    const interactive = gamePhase === GamePhase.BETTING && !paused;
    this.picker.setEnabled(interactive);
    this.layout.setInteractive(interactive);
  }

  private onPhase(phase: GamePhase): void {
    const state: GameState = this.store.getState();
    this.choreographer.onPhaseChange(phase, gameClock.now());
    this.updateInteractivity();

    switch (phase) {
      case GamePhase.BETTING:
        this.chips.reset();
        this.syncChips();
        this.layout.setWinning(null);
        void this.marker.retire();
        break;
      case GamePhase.RESULT:
        if (state.resultNumber !== null) {
          this.chips.markOutcome(state.resultNumber);
          this.layout.setWinning(state.resultNumber);
        }
        break;
      case GamePhase.PAYOUT:
        if (state.resultNumber !== null) {
          this.chips.playPayout(state.resultNumber);
          const cell = this.layout.layoutToWorld(rectCenter(numberRect(state.resultNumber)), 0);
          void this.marker.placeOn(cell, 0.5);
        }
        break;
      default:
        break;
    }
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height);
    this.director.setAspect(width / height);
  }

  private readonly frame = (realNow: number): void => {
    this.frameHandle = requestAnimationFrame(this.frame);
    const realDt = Math.min(0.1, Math.max(0, (realNow - this.lastRealTime) / 1000));
    this.lastRealTime = realNow;
    // Zero while paused: chips stop mid-flight, the wheel and ball hold still.
    const now = gameClock.now();
    const dt = Math.min(0.1, Math.max(0, (now - this.lastGameTime) / 1000));
    this.lastGameTime = now;
    this.gameElapsed += dt;

    const state = this.store.getState();
    const wheelAngle = wheelAngleAt(state.wheelMotion, now);
    this.wheel.setRotorAngle(wheelAngle);
    this.ball.update(now, state, wheelAngle);
    this.ballCam.update(realDt, state, now, this.ball.current);
    this.choreographer.update(now, state);
    this.tweens.update(dt);
    this.layout.update(this.gameElapsed);
    this.chips.update(this.gameElapsed);
    this.wheel.ballWorldPosition(this.ballWorld);
    this.director.update(realDt, this.ballWorld);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.frameHandle);
    this.unsubscribers.forEach((off) => off());
    this.resizeObserver.disconnect();
    this.picker.dispose();
    this.tweens.clear();
    this.disposables.forEach((d) => d.dispose());
    this.chipFactory.dispose();
    this.glow.dispose();
    Object.values(this.materials).forEach((value) => {
      if (Array.isArray(value)) value.forEach((t: Texture) => t.dispose());
      else (value as Disposable).dispose();
    });
    this.environmentMap?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
