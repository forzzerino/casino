import { describe, expect, it } from 'vitest';
import { Spots, gridNumber } from '../betting/betSpots';
import { LAYOUT, OUTSIDE_REGIONS, rectCenter, resolveSpotAt, spotAnchor } from '../betting/layout';
import { wheelNeighbours, WHEEL_ORDER } from '../roulette/wheel';
import type { BetSpot } from '../../types/game';

function allInsideSpots(): BetSpot[] {
  const spots: BetSpot[] = [];
  for (let n = 0; n <= 36; n++) spots.push(Spots.straight(n));
  for (let c = 0; c < 12; c++) {
    for (let r = 0; r < 3; r++) {
      if (c < 11) spots.push(Spots.split(gridNumber(c, r), gridNumber(c + 1, r)));
      if (r < 2) spots.push(Spots.split(gridNumber(c, r), gridNumber(c, r + 1)));
      if (c < 11 && r < 2) spots.push(Spots.corner(gridNumber(c, r)));
    }
    spots.push(Spots.street(gridNumber(c, 0)));
    if (c < 11) spots.push(Spots.sixLine(gridNumber(c, 0)));
  }
  spots.push(Spots.split(0, 1), Spots.split(0, 2), Spots.split(0, 3));
  spots.push(Spots.trio(1, 2), Spots.trio(2, 3), Spots.firstFour());
  return spots;
}

describe('betting layout', () => {
  it('has a reachable anchor for every inside bet (anchor → same spot)', () => {
    for (const spot of allInsideSpots()) {
      expect(resolveSpotAt(spotAnchor(spot))?.key, spot.key).toBe(spot.key);
    }
  });

  it('resolves every outside region from its centre', () => {
    for (const region of OUTSIDE_REGIONS) {
      expect(resolveSpotAt(rectCenter(region.rect))?.key).toBe(region.spot.key);
    }
  });

  it('places 3 on the far row and 1 on the street edge', () => {
    const { gridX0, cellW, cellH, gridH } = LAYOUT;
    expect(resolveSpotAt({ x: gridX0 + cellW / 2, y: cellH / 2 })?.key).toBe(Spots.straight(3).key);
    expect(resolveSpotAt({ x: gridX0 + cellW / 2, y: gridH - cellH / 2 })?.key).toBe(Spots.straight(1).key);
  });

  it('returns null away from the layout', () => {
    expect(resolveSpotAt({ x: -0.2, y: 0.1 })).toBeNull();
    expect(resolveSpotAt({ x: LAYOUT.width + 0.1, y: 0.1 })).toBeNull();
  });
});

describe('neighbours', () => {
  it('uses the physical wheel order, not numerical adjacency', () => {
    expect(wheelNeighbours(17, 2)).toEqual([2, 25, 17, 34, 6]);
    expect(wheelNeighbours(0, 1)).toEqual([26, 0, 32]);
    expect(wheelNeighbours(26, 3)).toEqual([12, 35, 3, 26, 0, 32, 15]);
  });

  it('wheel contains every number exactly once', () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
  });
});
