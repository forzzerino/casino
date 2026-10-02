/**
 * Paints the betting layout onto a transparent canvas laid over the felt. It is
 * drawn from the same rectangles used for hit-testing (game/betting/layout.ts).
 */
import { LAYOUT, OUTSIDE_REGIONS, numberRect, type Rect } from '../../game/betting/layout';
import { numberColor } from '../../game/roulette/numbers';
import type { Translate, TranslationKey } from '../../i18n';
import { BetType } from '../../types/game';
import { createCanvas } from './canvas';

export const LAYOUT_MARGIN = 0.035;
const PX_PER_METER = 1500;

export const LAYOUT_TEXTURE_SIZE = {
  width: Math.round((LAYOUT.width + 2 * LAYOUT_MARGIN) * PX_PER_METER),
  height: Math.round((LAYOUT.height + 2 * LAYOUT_MARGIN) * PX_PER_METER),
} as const;

const COLORS = {
  line: 'rgba(224, 205, 156, 0.88)',
  lineSoft: 'rgba(224, 205, 156, 0.35)',
  text: '#f3e9d3',
  textSoft: 'rgba(243, 233, 211, 0.88)',
  red: 'rgba(112, 12, 26, 0.95)',
  black: 'rgba(14, 14, 15, 0.93)',
  green: 'rgba(22, 100, 62, 0.95)',
} as const;

const LINE_WIDTH = 4;
const CELL_INSET = 9;

const OUTSIDE_LABELS: Partial<Record<string, TranslationKey>> = {
  'DOZEN:1': 'table.dozen1',
  'DOZEN:2': 'table.dozen2',
  'DOZEN:3': 'table.dozen3',
  'COLUMN:1': 'table.column',
  'COLUMN:2': 'table.column',
  'COLUMN:3': 'table.column',
  LOW: 'table.low',
  HIGH: 'table.high',
  EVEN: 'table.even',
  ODD: 'table.odd',
};

const s = (meters: number): number => meters * PX_PER_METER;

function pxRect(rect: Rect): { x: number; y: number; w: number; h: number } {
  return { x: s(rect.x), y: s(rect.y), w: s(rect.w), h: s(rect.h) };
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(s(x0), s(y0));
  ctx.lineTo(s(x1), s(y1));
  ctx.stroke();
}

function fillCell(ctx: CanvasRenderingContext2D, rect: Rect, color: string): void {
  const r = pxRect(rect);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(r.x + CELL_INSET, r.y + CELL_INSET, r.w - CELL_INSET * 2, r.h - CELL_INSET * 2, 10);
  ctx.fill();
}

function centerText(ctx: CanvasRenderingContext2D, text: string, rect: Rect, font: string, color: string, spacing = '0px'): void {
  const r = pxRect(rect);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = spacing;
  ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 2);
  ctx.letterSpacing = '0px';
}

function diamond(ctx: CanvasRenderingContext2D, rect: Rect, fill: string): void {
  const r = pxRect(rect);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const hw = r.w * 0.3;
  const hh = r.h * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.line;
  ctx.stroke();
}

function zeroPath(ctx: CanvasRenderingContext2D): void {
  const { zeroW, gridH } = LAYOUT;
  ctx.beginPath();
  ctx.moveTo(s(zeroW), s(0));
  ctx.lineTo(s(0.045), s(0));
  ctx.quadraticCurveTo(s(0.002), s(0.02), s(0.002), s(gridH / 2));
  ctx.quadraticCurveTo(s(0.002), s(gridH - 0.02), s(0.045), s(gridH));
  ctx.lineTo(s(zeroW), s(gridH));
}

export function createLayoutCanvas(): HTMLCanvasElement {
  return createCanvas(LAYOUT_TEXTURE_SIZE.width, LAYOUT_TEXTURE_SIZE.height).canvas;
}

export function drawLayout(canvas: HTMLCanvasElement, t: Translate): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { gridX0, gridX1, gridH, cellW, cellH, columnW, dozenH, height } = LAYOUT;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(s(LAYOUT_MARGIN), s(LAYOUT_MARGIN));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Number cells
  const numberFont = '600 74px Manrope, "Segoe UI", sans-serif';
  for (let n = 1; n <= 36; n++) {
    const rect = numberRect(n);
    fillCell(ctx, rect, numberColor(n) === 'red' ? COLORS.red : COLORS.black);
    centerText(ctx, String(n), rect, numberFont, COLORS.text);
  }

  // Zero
  zeroPath(ctx);
  ctx.closePath();
  ctx.fillStyle = COLORS.green;
  ctx.fill();
  centerText(ctx, '0', { x: 0.008, y: 0, w: LAYOUT.zeroW, h: gridH }, '600 84px Manrope, "Segoe UI", sans-serif', COLORS.text);

  // Outside bets
  const labelFont = '600 44px Manrope, "Segoe UI", sans-serif';
  for (const region of OUTSIDE_REGIONS) {
    if (region.spot.type === BetType.RED) diamond(ctx, region.rect, COLORS.red);
    else if (region.spot.type === BetType.BLACK) diamond(ctx, region.rect, COLORS.black);
    else {
      const key = OUTSIDE_LABELS[region.spot.key];
      if (key) centerText(ctx, t(key), region.rect, labelFont, COLORS.textSoft, '5px');
    }
  }

  // Grid lines, drawn once each
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = LINE_WIDTH;
  for (let row = 0; row <= 3; row++) line(ctx, gridX0, row * cellH, gridX1 + columnW, row * cellH);
  for (let col = 0; col <= 12; col++) line(ctx, gridX0 + col * cellW, 0, gridX0 + col * cellW, gridH);
  line(ctx, gridX1 + columnW, 0, gridX1 + columnW, gridH);
  line(ctx, gridX0, gridH + dozenH, gridX1, gridH + dozenH);
  line(ctx, gridX0, height, gridX1, height);
  for (let k = 0; k <= 3; k++) line(ctx, gridX0 + k * 4 * cellW, gridH, gridX0 + k * 4 * cellW, gridH + dozenH);
  for (let k = 0; k <= 6; k++) line(ctx, gridX0 + k * 2 * cellW, gridH + dozenH, gridX0 + k * 2 * cellW, height);
  zeroPath(ctx);
  ctx.stroke();

  // A fine outer keyline frames the whole layout.
  ctx.strokeStyle = COLORS.lineSoft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(s(-0.016), s(-0.016), s(gridX1 + columnW + 0.032), s(height + 0.032), 18);
  ctx.stroke();

  ctx.restore();
}
