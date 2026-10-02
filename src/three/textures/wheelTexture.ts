/**
 * Top-down painting of the rotor (number ring + pocket floors), projected onto
 * the rotor surfaces with planar UVs. Pocket angles come from the same
 * `pocketLocalAngle` the trajectory planner uses, so the ball always settles in
 * the pocket whose number is painted next to it.
 */
import { numberColor } from '../../game/roulette/numbers';
import { POCKET_COUNT, POCKET_STEP, numberAtPocket, pocketLocalAngle } from '../../game/roulette/wheel';
import { WHEEL_DIMENSIONS } from '../../game/roulette/wheelDimensions';
import type { CanvasTexture } from 'three';
import { createCanvas, toTexture } from './canvas';

/** Radius (m) covered by the texture — the UV mapping must use the same value. */
export const ROTOR_TEXTURE_RADIUS = WHEEL_DIMENSIONS.rotorRadius;
const SIZE = 2048;

const RING_COLORS = { red: '#86141e', black: '#151517', green: '#13703f' } as const;
const POCKET_COLORS = { red: '#5c1016', black: '#0e0e10', green: '#0d4f2d' } as const;

export function createRotorTexture(): CanvasTexture {
  const { canvas, ctx } = createCanvas(SIZE, SIZE);
  const c = SIZE / 2;
  const scale = c / ROTOR_TEXTURE_RADIUS;
  const d = WHEEL_DIMENSIONS;

  // Base wood-dark background (visible on the rim edges).
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Canvas angle convention: a stator angle α maps to (c + cos α · r, c − sin α · r).
  const wedge = (inner: number, outer: number, angle: number, color: string) => {
    const a0 = -(angle + POCKET_STEP / 2);
    const a1 = -(angle - POCKET_STEP / 2);
    ctx.beginPath();
    ctx.arc(c, c, outer * scale, a0, a1);
    ctx.arc(c, c, inner * scale, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  for (let i = 0; i < POCKET_COUNT; i++) {
    const n = numberAtPocket(i);
    const color = numberColor(n);
    const angle = pocketLocalAngle(i);
    wedge(d.pocketInnerRadius - 0.004, d.pocketOuterRadius + 0.002, angle, POCKET_COLORS[color]);
    wedge(d.numberRingInner - 0.002, d.numberRingOuter, angle, RING_COLORS[color]);
  }

  // Gold separators on the number ring.
  ctx.strokeStyle = 'rgba(214, 178, 110, 0.9)';
  ctx.lineWidth = 5;
  for (let i = 0; i < POCKET_COUNT; i++) {
    const a = pocketLocalAngle(i) + POCKET_STEP / 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * d.numberRingInner * scale, c - Math.sin(a) * d.numberRingInner * scale);
    ctx.lineTo(c + Math.cos(a) * d.numberRingOuter * scale, c - Math.sin(a) * d.numberRingOuter * scale);
    ctx.stroke();
  }

  // Rim lines framing the ring.
  ctx.lineWidth = 8;
  for (const r of [d.numberRingInner, d.numberRingOuter]) {
    ctx.beginPath();
    ctx.arc(c, c, r * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Numbers, reading outward.
  ctx.fillStyle = '#f4ecd9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 84px Manrope, "Segoe UI", sans-serif';
  const textRadius = (d.numberRingInner + d.numberRingOuter) / 2 + 0.004;
  for (let i = 0; i < POCKET_COUNT; i++) {
    const angle = pocketLocalAngle(i);
    ctx.save();
    ctx.translate(c + Math.cos(angle) * textRadius * scale, c - Math.sin(angle) * textRadius * scale);
    ctx.rotate(Math.PI / 2 - angle);
    ctx.fillText(String(numberAtPocket(i)), 0, 0);
    ctx.restore();
  }

  return toTexture(canvas, { anisotropy: 8 });
}
