/**
 * Reusable object animations (chips, markers). Each returns a promise that
 * resolves when the motion ends, so choreography reads top-to-bottom.
 */
import { Vector3, type Object3D } from 'three';
import { Ease, type Easing } from '../../utils/easing';
import type { Tweens } from './Tweens';

export interface ArcOptions {
  readonly duration: number;
  /** Peak height of the arc above the straight line between endpoints. */
  readonly height: number;
  readonly delay?: number;
  readonly ease?: Easing;
  readonly tag?: object;
  /** Extra spin around Y during flight (radians). */
  readonly spin?: number;
  readonly onLand?: () => void;
}

/** Moves an object along a parabolic arc from wherever it is when the tween starts. */
export function arcTo(tweens: Tweens, object: Object3D, to: Vector3, o: ArcOptions): Promise<void> {
  const from = new Vector3();
  let startRotation = 0;
  return tweens.add({
    duration: o.duration,
    delay: o.delay,
    ease: o.ease ?? Ease.inOutQuad,
    tag: o.tag ?? object,
    onStart: () => {
      from.copy(object.position);
      startRotation = object.rotation.y;
    },
    onUpdate: (e) => {
      object.position.lerpVectors(from, to, e);
      object.position.y += o.height * 4 * e * (1 - e);
      if (o.spin) object.rotation.y = startRotation + o.spin * e;
    },
    onComplete: o.onLand,
  }).finished;
}

/** Quick squash-and-recover used when a stack's value changes. */
export function pop(
  tweens: Tweens,
  object: Object3D,
  o: { amount?: number; duration?: number; delay?: number; tag?: object } = {},
): Promise<void> {
  const amount = o.amount ?? 0.16;
  return tweens.add({
    duration: o.duration ?? 0.3,
    delay: o.delay,
    ease: Ease.linear,
    tag: o.tag ?? object,
    onUpdate: (_, raw) => {
      const wave = Math.sin(raw * Math.PI) * (1 - raw * 0.35);
      object.scale.set(1 + amount * wave, 1 - amount * 0.6 * wave, 1 + amount * wave);
    },
    onComplete: () => object.scale.set(1, 1, 1),
  }).finished;
}

export function scaleTo(
  tweens: Tweens,
  object: Object3D,
  target: number,
  o: { duration: number; delay?: number; ease?: Easing; tag?: object },
): Promise<void> {
  let from = 1;
  return tweens.add({
    duration: o.duration,
    delay: o.delay,
    ease: o.ease ?? Ease.inOutCubic,
    tag: o.tag ?? object,
    onStart: () => (from = object.scale.x),
    onUpdate: (e) => object.scale.setScalar(from + (target - from) * e),
  }).finished;
}

export function moveTo(
  tweens: Tweens,
  object: Object3D,
  to: Vector3,
  o: { duration: number; delay?: number; ease?: Easing; tag?: object; onComplete?: () => void },
): Promise<void> {
  const from = new Vector3();
  return tweens.add({
    duration: o.duration,
    delay: o.delay,
    ease: o.ease ?? Ease.inOutCubic,
    tag: o.tag ?? object,
    onStart: () => from.copy(object.position),
    onUpdate: (e) => object.position.lerpVectors(from, to, e),
    onComplete: o.onComplete,
  }).finished;
}
