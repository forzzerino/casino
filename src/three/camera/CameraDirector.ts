import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { Ease, type Easing } from '../../utils/easing';
import { clamp } from '../../utils/math';
import { WORLD } from '../sceneLayout';
import { SHOTS, type ShotId } from './cameraShots';

const DESIGN_ASPECT = 16 / 9;

export interface Pose {
  readonly position: Vector3;
  readonly target: Vector3;
  fov: number;
}

/** Supplies the pose of a shot that moves on its own (e.g. the ball cam), every frame. */
export type DynamicShot = () => Pose;

interface Transition {
  readonly from: Pose;
  readonly start: number;
  readonly duration: number;
  readonly ease: Easing;
}

const createPose = (): Pose => ({ position: new Vector3(), target: new Vector3(), fov: 40 });

/**
 * Broadcast-style camera: every move is an eased interpolation between authored
 * shots, with a barely perceptible drift so the frame never feels frozen.
 * There is no free camera by design.
 */
export class CameraDirector {
  private shot: ShotId = 'INTRO';
  private transition: Transition | null = null;
  private readonly current = createPose();
  private readonly goal = createPose();
  private readonly follow = new Vector3();
  private readonly followGoal = new Vector3();
  private time = 0;
  private aspect = DESIGN_ASPECT;
  private readonly dynamicShots = new Map<ShotId, DynamicShot>();

  constructor(private readonly camera: PerspectiveCamera) {
    this.computeGoal(0);
    this.current.position.copy(this.goal.position);
    this.current.target.copy(this.goal.target);
    this.current.fov = this.goal.fov;
    this.apply();
  }

  get shotId(): ShotId {
    return this.shot;
  }

  goTo(shot: ShotId, duration = 2.2, ease: Easing = Ease.inOutCubic): void {
    if (shot === this.shot && !this.transition) return;
    const from = createPose();
    from.position.copy(this.current.position);
    from.target.copy(this.current.target);
    from.fov = this.current.fov;
    this.shot = shot;
    this.transition = { from, start: this.time, duration, ease };
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
  }

  /** Lets a shot be driven by live logic instead of a fixed pose; transitions still ease into it. */
  setDynamicShot(id: ShotId, shot: DynamicShot): void {
    this.dynamicShots.set(id, shot);
  }

  private computeGoal(time: number): void {
    const dynamic = this.dynamicShots.get(this.shot);
    if (dynamic) {
      const pose = dynamic();
      this.goal.position.copy(pose.position);
      this.goal.target.copy(pose.target);
      this.goal.fov = pose.fov;
      return;
    }

    const shot = SHOTS[this.shot];
    this.goal.position.copy(shot.position);
    this.goal.target.copy(shot.target);
    this.goal.fov = shot.fov;

    if (shot.orbit) {
      const pivot = shot.target;
      const angle = time * shot.orbit;
      const dx = shot.position.x - pivot.x;
      const dz = shot.position.z - pivot.z;
      this.goal.position.x = pivot.x + dx * Math.cos(angle) - dz * Math.sin(angle);
      this.goal.position.z = pivot.z + dx * Math.sin(angle) + dz * Math.cos(angle);
    }

    const d = shot.drift;
    if (d > 0) {
      this.goal.position.x += Math.sin(time * 0.13) * 0.03 * d;
      this.goal.position.y += Math.sin(time * 0.09 + 1.3) * 0.015 * d;
      this.goal.position.z += Math.sin(time * 0.07 + 0.4) * 0.02 * d;
      this.goal.target.x += Math.sin(time * 0.11 + 2.1) * 0.01 * d;
    }
    this.goal.target.add(this.follow);
  }

  /** @param ball world position of the ball, used by shots that lean toward it */
  update(dt: number, ball: Vector3 | null): void {
    this.time += dt;
    const shot = SHOTS[this.shot];
    if (shot.follow > 0 && ball) this.followGoal.copy(ball).sub(WORLD.wheelCenter).setY(0).multiplyScalar(shot.follow);
    else this.followGoal.set(0, 0, 0);
    this.follow.lerp(this.followGoal, 1 - Math.exp(-1.6 * dt));

    this.computeGoal(this.time);

    if (this.transition) {
      const t = this.transition;
      const u = clamp((this.time - t.start) / t.duration, 0, 1);
      const e = t.ease(u);
      this.current.position.lerpVectors(t.from.position, this.goal.position, e);
      this.current.target.lerpVectors(t.from.target, this.goal.target, e);
      this.current.fov = MathUtils.lerp(t.from.fov, this.goal.fov, e);
      if (u >= 1) this.transition = null;
    } else {
      this.current.position.copy(this.goal.position);
      this.current.target.copy(this.goal.target);
      this.current.fov = this.goal.fov;
    }
    this.apply();
  }

  private apply(): void {
    // Shots are framed for 16:9; on narrower windows widen the lens to keep the table in frame.
    let fov = this.current.fov;
    if (this.aspect < DESIGN_ASPECT) {
      const tanHalf = Math.tan(MathUtils.degToRad(fov / 2)) * (DESIGN_ASPECT / this.aspect);
      fov = Math.min(75, MathUtils.radToDeg(2 * Math.atan(tanHalf)));
    }
    this.camera.position.copy(this.current.position);
    this.camera.lookAt(this.current.target);
    if (Math.abs(this.camera.fov - fov) > 1e-4 || this.camera.aspect !== this.aspect) {
      this.camera.fov = fov;
      this.camera.aspect = this.aspect;
      this.camera.updateProjectionMatrix();
    }
  }
}
