import {
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { WHEEL_DIMENSIONS } from '../../game/roulette/wheelDimensions';
import type { MaterialLibrary } from '../materials';
import { WORLD } from '../sceneLayout';
import { insetBounds, roundedRectPerimeter, roundedRectShape } from './shapes';

const TOP_THICKNESS = 0.045;
const FELT_INSET = 0.055;
const RAIL_RADIUS = 0.042;
const RAIL_INSET = 0.034;
const BODY_INSET = 0.11;
/** The croupier's side of the table is left open (no armrest) between these x values. */
const DEALER_GAP = { fromX: 0.42, toX: -0.98 } as const;

/** Wooden table with inset felt, padded leather armrest, cabinet body and foot rail. */
export class Table {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];

  constructor(private readonly materials: MaterialLibrary) {
    this.group.name = 'table';
    const bounds = WORLD.table;
    const radius = bounds.cornerRadius;

    // Wooden top slab, its surface just under the felt.
    const top = this.mesh(
      new ExtrudeGeometry(roundedRectShape(bounds, radius), {
        depth: TOP_THICKNESS,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 3,
        curveSegments: 24,
      }),
      materials.walnut,
    );
    top.geometry.rotateX(-Math.PI / 2);
    top.position.y = -TOP_THICKNESS - 0.009;

    const felt = this.mesh(new ShapeGeometry(roundedRectShape(insetBounds(bounds, FELT_INSET), radius - FELT_INSET), 24), materials.felt);
    felt.geometry.rotateX(-Math.PI / 2);
    felt.position.y = 0;
    felt.castShadow = false;

    this.buildRail(bounds, radius);

    // Cabinet body and plinth.
    const bodyHeight = -WORLD.floorY - 0.2;
    const body = this.mesh(
      new ExtrudeGeometry(roundedRectShape(insetBounds(bounds, BODY_INSET), radius - BODY_INSET), {
        depth: bodyHeight,
        bevelEnabled: false,
        curveSegments: 24,
      }),
      materials.walnutMatte,
    );
    body.geometry.rotateX(-Math.PI / 2);
    body.position.y = WORLD.floorY + 0.12;

    const plinth = this.mesh(
      new ExtrudeGeometry(roundedRectShape(insetBounds(bounds, BODY_INSET + 0.04), radius - BODY_INSET - 0.04), {
        depth: 0.12,
        bevelEnabled: false,
        curveSegments: 24,
      }),
      materials.darkMetal,
    );
    plinth.geometry.rotateX(-Math.PI / 2);
    plinth.position.y = WORLD.floorY;

    // Brass foot rail along the player side.
    const footRail = this.mesh(new CylinderGeometry(0.016, 0.016, bounds.maxX - bounds.minX - 0.5, 20), materials.brass);
    footRail.geometry.rotateZ(Math.PI / 2);
    footRail.position.set((bounds.minX + bounds.maxX) / 2, WORLD.floorY + 0.24, bounds.maxZ - BODY_INSET + 0.09);

    // Recessed wheel well trim.
    const trim = this.mesh(new TorusGeometry(WHEEL_DIMENSIONS.cabinetRadius + 0.012, 0.004, 8, 96), materials.brass);
    trim.geometry.rotateX(Math.PI / 2);
    trim.position.set(WORLD.wheelCenter.x, 0.002, WORLD.wheelCenter.z);
  }

  private mesh(geometry: BufferGeometry, material: Material): Mesh {
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  /** Leather armrest following the edge, open on the croupier's side. */
  private buildRail(bounds: typeof WORLD.table, radius: number): void {
    const path = roundedRectPerimeter(insetBounds(bounds, RAIL_INSET), radius - RAIL_INSET, 0.028);
    // Start just right of the dealer's gap and walk all the way round to its left edge.
    const startIndex = path.findIndex((p) => p.x >= DEALER_GAP.fromX);
    const rotated = [...path.slice(startIndex), ...path.slice(0, startIndex)];
    const inGap = (p: (typeof path)[number]) =>
      p.z < bounds.minZ + 0.1 && p.x < DEALER_GAP.fromX && p.x > DEALER_GAP.toX;
    const points = rotated.filter((p) => !inGap(p));
    const curve = new CatmullRomCurve3(points, false, 'centripetal');
    this.mesh(new TubeGeometry(curve, 320, RAIL_RADIUS, 18, false), this.materials.leather);

    const cap = new SphereGeometry(RAIL_RADIUS, 18, 12);
    this.geometries.push(cap);
    for (const point of [points[0], points[points.length - 1]]) {
      const mesh = new Mesh(cap, this.materials.leather);
      mesh.position.copy(point);
      mesh.castShadow = true;
      this.group.add(mesh);
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
  }
}
