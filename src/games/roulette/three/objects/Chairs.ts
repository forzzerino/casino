import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import type { MaterialLibrary } from '../materials';
import { BOT_SEATS, WORLD } from '../sceneLayout';

const SEAT_HEIGHT = 0.74;

/** High-backed casino stools at each bot seat. Simple primitives, shared geometry. */
export class Chairs {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[];
  private readonly backMaterial: Material;

  constructor(materials: MaterialLibrary) {
    const backrestMaterial = materials.leather.clone();
    backrestMaterial.side = DoubleSide;
    backrestMaterial.color = new Color('#1a110c');
    this.backMaterial = backrestMaterial;
    this.group.name = 'chairs';
    const seat = new CylinderGeometry(0.21, 0.19, 0.075, 32);
    const back = new CylinderGeometry(0.22, 0.22, 0.26, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
    const pole = new CylinderGeometry(0.03, 0.03, SEAT_HEIGHT - 0.06, 16);
    const base = new CylinderGeometry(0.2, 0.24, 0.025, 32);
    const footRing = new TorusGeometry(0.19, 0.011, 8, 40);
    footRing.rotateX(Math.PI / 2);
    this.geometries = [seat, back, pole, base, footRing];

    const part = (chair: Group, geometry: BufferGeometry, material: Material, y: number): Mesh => {
      const mesh = new Mesh(geometry, material);
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      chair.add(mesh);
      return mesh;
    };

    for (const { chair: placement } of BOT_SEATS) {
      const chair = new Group();
      chair.position.set(placement.x, WORLD.floorY, placement.z);
      chair.rotation.y = placement.rotation;
      part(chair, base, materials.darkMetal, 0.0125);
      part(chair, pole, materials.brassSatin, (SEAT_HEIGHT - 0.06) / 2);
      part(chair, footRing, materials.brass, 0.32);
      part(chair, seat, materials.leather, SEAT_HEIGHT);
      const backrest = part(chair, back, this.backMaterial, SEAT_HEIGHT + 0.2);
      // Open side of the backrest faces the table (local −Z after rotation).
      backrest.rotation.y = Math.PI;
      this.group.add(chair);
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.backMaterial.dispose();
  }
}
