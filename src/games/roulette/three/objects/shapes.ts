import { Shape, Vector3 } from 'three';

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export function insetBounds(b: Bounds, inset: number): Bounds {
  return { minX: b.minX + inset, maxX: b.maxX - inset, minZ: b.minZ + inset, maxZ: b.maxZ - inset };
}

/**
 * Rounded rectangle in the XZ plane, expressed as a Shape in (x, −z) so that
 * after `rotateX(−π/2)` it lies flat with the right orientation.
 */
export function roundedRectShape(b: Bounds, radius: number): Shape {
  const shape = new Shape();
  const x0 = b.minX;
  const x1 = b.maxX;
  const y0 = -b.maxZ;
  const y1 = -b.minZ;
  const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2);
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + r);
  shape.lineTo(x1, y1 - r);
  shape.quadraticCurveTo(x1, y1, x1 - r, y1);
  shape.lineTo(x0 + r, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);
  return shape;
}

/**
 * Evenly sampled points around a rounded rectangle in world XZ, starting at the
 * far-left end of the far edge and running toward +X — suitable for tube paths.
 */
export function roundedRectPerimeter(b: Bounds, radius: number, y: number, spacing = 0.04): Vector3[] {
  const r = radius;
  const points: Vector3[] = [];
  const straight = (x0: number, z0: number, x1: number, z1: number) => {
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / spacing));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      points.push(new Vector3(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t));
    }
  };
  const arc = (cx: number, cz: number, from: number) => {
    const steps = Math.max(4, Math.round((r * Math.PI) / 2 / spacing));
    for (let i = 0; i < steps; i++) {
      const a = from + ((Math.PI / 2) * i) / steps;
      points.push(new Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
    }
  };
  // Angles in XZ with +X = 0 and +Z = π/2.
  straight(b.minX + r, b.minZ, b.maxX - r, b.minZ);
  arc(b.maxX - r, b.minZ + r, -Math.PI / 2);
  straight(b.maxX, b.minZ + r, b.maxX, b.maxZ - r);
  arc(b.maxX - r, b.maxZ - r, 0);
  straight(b.maxX - r, b.maxZ, b.minX + r, b.maxZ);
  arc(b.minX + r, b.maxZ - r, Math.PI / 2);
  straight(b.minX, b.maxZ - r, b.minX, b.minZ + r);
  arc(b.minX + r, b.minZ + r, Math.PI);
  return points;
}
