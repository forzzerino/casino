import { Ease, type Easing } from '../../utils/easing';
import { clamp } from '../../utils/math';

export interface TweenOptions {
  readonly duration: number;
  readonly delay?: number;
  readonly ease?: Easing;
  /** Tweens sharing a tag can be cancelled together (e.g. everything animating one chip). */
  readonly tag?: object;
  readonly onStart?: () => void;
  /** Called every frame with eased progress (0..1) and raw progress. */
  readonly onUpdate?: (eased: number, raw: number) => void;
  readonly onComplete?: () => void;
}

export interface TweenHandle {
  cancel(): void;
  readonly finished: Promise<void>;
}

interface ActiveTween {
  readonly options: TweenOptions;
  readonly startAt: number;
  started: boolean;
  cancelled: boolean;
  resolve: () => void;
}

/**
 * Tiny time-based tween runner advanced from the render loop. All scene
 * animations (chips, markers, highlights) go through it so they share one clock.
 */
export class Tweens {
  private readonly active: ActiveTween[] = [];
  private time = 0;

  add(options: TweenOptions): TweenHandle {
    let resolve: () => void = () => undefined;
    const finished = new Promise<void>((r) => (resolve = r));
    const tween: ActiveTween = {
      options,
      startAt: this.time + (options.delay ?? 0),
      started: false,
      cancelled: false,
      resolve,
    };
    this.active.push(tween);
    return {
      finished,
      cancel: () => {
        tween.cancelled = true;
        resolve();
      },
    };
  }

  wait(seconds: number, tag?: object): Promise<void> {
    return this.add({ duration: seconds, tag }).finished;
  }

  cancelTag(tag: object): void {
    for (const tween of this.active) {
      if (tween.options.tag === tag && !tween.cancelled) {
        tween.cancelled = true;
        tween.resolve();
      }
    }
  }

  update(dt: number): void {
    this.time += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const tween = this.active[i];
      if (tween.cancelled) {
        this.active.splice(i, 1);
        continue;
      }
      if (this.time < tween.startAt) continue;
      const { options } = tween;
      if (!tween.started) {
        tween.started = true;
        options.onStart?.();
      }
      const raw = options.duration <= 0 ? 1 : clamp((this.time - tween.startAt) / options.duration, 0, 1);
      options.onUpdate?.((options.ease ?? Ease.inOutCubic)(raw), raw);
      if (raw >= 1) {
        this.active.splice(i, 1);
        options.onComplete?.();
        tween.resolve();
      }
    }
  }

  clear(): void {
    for (const tween of this.active) tween.resolve();
    this.active.length = 0;
  }
}
