import { CylinderGeometry, Group, Mesh, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { Ease } from '../../../../shared/utils/easing';
import { arcTo } from '../animations/objectAnimations';
import type { Tweens } from '../animations/Tweens';
import type { MaterialLibrary } from '../materials';
import { WORLD } from '../sceneLayout';

/**
 * The brass "dolly" a croupier places on the winning number, keeping the
 * result visually anchored to the layout through the payout.
 */
export class WinMarker {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];

  constructor(
    materials: MaterialLibrary,
    private readonly tweens: Tweens,
  ) {
    this.group.name = 'win-marker';
    const part = (geometry: BufferGeometry, y: number) => {
      this.geometries.push(geometry);
      const mesh = new Mesh(geometry, materials.brass);
      mesh.position.y = y;
      mesh.castShadow = true;
      this.group.add(mesh);
    };
    part(new CylinderGeometry(0.017, 0.019, 0.006, 32), 0.003);
    part(new CylinderGeometry(0.007, 0.011, 0.03, 24), 0.021);
    part(new SphereGeometry(0.0125, 24, 16), 0.042);
    this.group.position.copy(WORLD.markerRest);
  }

  placeOn(target: Vector3, delay = 0): Promise<void> {
    return arcTo(this.tweens, this.group, target, {
      duration: 0.75,
      height: 0.12,
      delay,
      ease: Ease.inOutCubic,
      tag: this,
    });
  }

  retire(): Promise<void> {
    if (this.group.position.distanceTo(WORLD.markerRest) < 0.001) return Promise.resolve();
    return arcTo(this.tweens, this.group, WORLD.markerRest, { duration: 0.6, height: 0.1, tag: this });
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
  }
}
