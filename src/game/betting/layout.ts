/**
 * Geometry of the betting layout in metres, in a 2D frame whose origin is the
 * far-left corner of the zero box; +x runs along the table, +y toward the player.
 *
 *   ┌────┬───┬───┬─ … ─┬────┬─────┐  row 2:  3  6  9 … 36
 *   │    │ 3 │ 6 │     │ 36 │ 2:1 │
 *   │ 0  │ 2 │ 5 │     │ 35 │ 2:1 │  row 1:  2  5  8 … 35
 *   │    │ 1 │ 4 │     │ 34 │ 2:1 │  row 0:  1  4  7 … 34   ← street edge
 *   └────┼───┴───┴─ … ─┴────┼─────┘
 *        │ 1st 12 │ 2nd 12 │ 3rd 12 │
 *        │1-18│EVEN│RED│BLK│ODD│19-36│
 *
 * The same rectangles drive the felt texture, the hit-testing and chip anchors,
 * so what the player sees is exactly what they can click.
 */
import type { BetSpot } from '../../types/game';
import { BetType } from '../../types/game';
import { clamp } from '../../utils/math';
import { Spots, gridNumber } from './betSpots';

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const CELL_W = 0.1;
const CELL_H = 0.115;
const ZERO_W = 0.1;
const COLUMN_W = 0.1;
const DOZEN_H = 0.092;
const OUTSIDE_H = 0.092;

export const LAYOUT = {
  cellW: CELL_W,
  cellH: CELL_H,
  zeroW: ZERO_W,
  columnW: COLUMN_W,
  dozenH: DOZEN_H,
  outsideH: OUTSIDE_H,
  gridX0: ZERO_W,
  gridX1: ZERO_W + 12 * CELL_W,
  gridH: 3 * CELL_H,
  width: ZERO_W + 12 * CELL_W + COLUMN_W,
  height: 3 * CELL_H + DOZEN_H + OUTSIDE_H,
  /** How close (m) to a grid line a click must be to count as a split / corner / street. */
  edgeTolerance: 0.021,
} as const;

export interface LayoutRegion {
  readonly spot: BetSpot;
  readonly rect: Rect;
}

export function rectCenter(rect: Rect): Point2 {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function rectContains(rect: Rect, p: Point2): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
}

/** Column 0..11 and row 0..2 (0 = row nearest the player) of a number 1..36. */
export function gridPosition(n: number): { column: number; row: number } {
  return { column: Math.floor((n - 1) / 3), row: (n - 1) % 3 };
}

export const ZERO_RECT: Rect = { x: 0, y: 0, w: ZERO_W, h: LAYOUT.gridH };

export function numberRect(n: number): Rect {
  if (n === 0) return ZERO_RECT;
  const { column, row } = gridPosition(n);
  return { x: LAYOUT.gridX0 + column * CELL_W, y: LAYOUT.gridH - (row + 1) * CELL_H, w: CELL_W, h: CELL_H };
}

const columnCenterX = (column: number): number => LAYOUT.gridX0 + (column + 0.5) * CELL_W;
const rowCenterY = (row: number): number => LAYOUT.gridH - (row + 0.5) * CELL_H;
/** y of the horizontal grid line `line` (0 = street edge, 3 = far edge). */
const lineY = (line: number): number => LAYOUT.gridH - line * CELL_H;
/** x of the vertical grid line `line` (0 = zero boundary, 12 = column-bet boundary). */
const lineX = (line: number): number => LAYOUT.gridX0 + line * CELL_W;

export const OUTSIDE_REGIONS: readonly LayoutRegion[] = [
  ...([1, 2, 3] as const).map((index) => ({
    spot: Spots.column(index),
    rect: { x: LAYOUT.gridX1, y: LAYOUT.gridH - index * CELL_H, w: COLUMN_W, h: CELL_H },
  })),
  ...([1, 2, 3] as const).map((index) => ({
    spot: Spots.dozen(index),
    rect: { x: LAYOUT.gridX0 + (index - 1) * 4 * CELL_W, y: LAYOUT.gridH, w: 4 * CELL_W, h: DOZEN_H },
  })),
  ...[Spots.low(), Spots.even(), Spots.red(), Spots.black(), Spots.odd(), Spots.high()].map((spot, i) => ({
    spot,
    rect: { x: LAYOUT.gridX0 + i * 2 * CELL_W, y: LAYOUT.gridH + DOZEN_H, w: 2 * CELL_W, h: OUTSIDE_H },
  })),
];

const OUTSIDE_BY_KEY: ReadonlyMap<string, LayoutRegion> = new Map(OUTSIDE_REGIONS.map((r) => [r.spot.key, r]));

export function outsideRegion(spot: BetSpot): LayoutRegion | undefined {
  return OUTSIDE_BY_KEY.get(spot.key);
}

/** Where a chip sits for the given spot. */
export function spotAnchor(spot: BetSpot): Point2 {
  const nums = spot.numbers;
  const region = outsideRegion(spot);
  if (region) return rectCenter(region.rect);

  switch (spot.type) {
    case BetType.STRAIGHT:
      return rectCenter(numberRect(nums[0]));
    case BetType.SPLIT: {
      const [a, b] = nums;
      if (a === 0) return { x: lineX(0), y: rowCenterY(gridPosition(b).row) };
      const pa = gridPosition(a);
      if (b - a === 3) return { x: lineX(pa.column + 1), y: rowCenterY(pa.row) };
      return { x: columnCenterX(pa.column), y: lineY(pa.row + 1) };
    }
    case BetType.STREET: {
      if (nums[0] === 0) return { x: lineX(0), y: lineY(nums[1] === 1 ? 1 : 2) };
      return { x: columnCenterX(gridPosition(nums[0]).column), y: lineY(0) };
    }
    case BetType.CORNER: {
      if (nums[0] === 0) return { x: lineX(0), y: lineY(0) };
      const p = gridPosition(nums[0]);
      return { x: lineX(p.column + 1), y: lineY(p.row + 1) };
    }
    case BetType.SIX_LINE:
      return { x: lineX(gridPosition(nums[0]).column + 1), y: lineY(0) };
    default:
      return rectCenter(ZERO_RECT);
  }
}

/** Rectangles to highlight when a spot is hovered or selected. */
export function spotRects(spot: BetSpot): Rect[] {
  const region = outsideRegion(spot);
  if (region) return [region.rect];
  return spot.numbers.map(numberRect);
}

function resolveInsideSpot(p: Point2): BetSpot {
  const tol = LAYOUT.edgeTolerance;
  const gx = (p.x - LAYOUT.gridX0) / CELL_W;
  const gv = (LAYOUT.gridH - p.y) / CELL_H;
  const nearestX = Math.round(gx);
  const nearestV = Math.round(gv);
  const nearX = Math.abs(gx - nearestX) * CELL_W <= tol && nearestX <= 11;
  const nearV = Math.abs(gv - nearestV) * CELL_H <= tol && nearestV <= 2;
  const column = clamp(Math.floor(gx), 0, 11);
  const row = clamp(Math.floor(gv), 0, 2);

  if (nearX && nearV) {
    if (nearestX === 0) return nearestV === 0 ? Spots.firstFour() : Spots.trio(nearestV, nearestV + 1);
    if (nearestV === 0) return Spots.sixLine(gridNumber(nearestX - 1, 0));
    return Spots.corner(gridNumber(nearestX - 1, nearestV - 1));
  }
  if (nearX) {
    return nearestX === 0
      ? Spots.split(0, gridNumber(0, row))
      : Spots.split(gridNumber(nearestX - 1, row), gridNumber(nearestX, row));
  }
  if (nearV) {
    return nearestV === 0
      ? Spots.street(gridNumber(column, 0))
      : Spots.split(gridNumber(column, nearestV - 1), gridNumber(column, nearestV));
  }
  if (gx < 0) return Spots.straight(0);
  return Spots.straight(gridNumber(column, row));
}

/** Maps a point on the felt to the bet it would place, or null outside the layout. */
export function resolveSpotAt(p: Point2): BetSpot | null {
  const tol = LAYOUT.edgeTolerance;
  const inGridZone = p.x >= LAYOUT.gridX0 - tol && p.x < LAYOUT.gridX1 && p.y >= 0 && p.y <= LAYOUT.gridH + tol;
  if (inGridZone) return resolveInsideSpot(p);
  if (rectContains(ZERO_RECT, p)) return Spots.straight(0);
  for (const region of OUTSIDE_REGIONS) {
    if (rectContains(region.rect, p)) return region.spot;
  }
  return null;
}
