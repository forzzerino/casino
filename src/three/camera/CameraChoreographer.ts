import type { GameState, GameStoreApi } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import { CameraMode } from '../../types/ui';
import { Ease } from '../../utils/easing';
import type { CameraDirector } from './CameraDirector';
import { shotForMode } from './cameraShots';

/** Seconds before the ball leaves the track that the camera starts its push-in. */
const PUSH_IN_LEAD = 0.9;
/** Pause on the table after "No more bets" before heading to the wheel. */
const WHEEL_MOVE_DELAY_MS = 450;
const AUTO_DURATIONS: Readonly<Record<CameraMode, number>> = { TABLE: 2.4, WHEEL: 2.0, DEALER: 2.4 };
const MANUAL_DURATION = 1.6;

/**
 * Automatic broadcast choreography layered over the manual camera buttons:
 *
 *   BETTING → table · NO MORE BETS → wheel · ball dropping → gentle push-in
 *   RESULT → hold on the wheel · PAYOUT → back to the table
 *
 * Manual selections always win until the next phase change; with "auto" off the
 * camera only moves when the player asks.
 */
export class CameraChoreographer {
  private pushedFor: unknown = null;
  private pendingWheelAt = 0;
  private changingAutomatically = false;

  constructor(
    private readonly store: GameStoreApi,
    private readonly director: CameraDirector,
  ) {}

  /** Mirrors the store's camera mode, whoever changed it. */
  onModeChange(mode: CameraMode): void {
    const duration = this.changingAutomatically ? AUTO_DURATIONS[mode] : MANUAL_DURATION;
    this.director.goTo(shotForMode(mode), duration, Ease.inOutCubic);
  }

  private setMode(mode: CameraMode): void {
    this.changingAutomatically = true;
    this.store.getState().setCameraMode(mode);
    this.changingAutomatically = false;
  }

  onPhaseChange(phase: GamePhase, now: number): void {
    const s = this.store.getState();
    if (!s.autoCamera || !s.hasEntered) return;
    if (phase === GamePhase.BETTING || phase === GamePhase.PAYOUT) this.setMode(CameraMode.TABLE);
    if (phase === GamePhase.NO_MORE_BETS) this.pendingWheelAt = now + WHEEL_MOVE_DELAY_MS;
  }

  update(now: number, s: GameState): void {
    if (this.pendingWheelAt > 0 && now >= this.pendingWheelAt) {
      this.pendingWheelAt = 0;
      if (s.autoCamera && s.gamePhase === GamePhase.NO_MORE_BETS) this.setMode(CameraMode.WHEEL);
    }

    const plan = s.spinPlan;
    if (!s.autoCamera || s.gamePhase !== GamePhase.SPINNING || !plan || s.cameraMode !== CameraMode.WHEEL) return;
    if (this.pushedFor === plan) return;
    if ((now - s.spinStartedAt) / 1000 >= plan.dropTime - PUSH_IN_LEAD) {
      this.pushedFor = plan;
      this.director.goTo('WHEEL_CLOSE', 3.4, Ease.inOutSine);
    }
  }
}
