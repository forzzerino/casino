/**
 * The only source of randomness for game outcomes. Live play draws from the
 * platform CSPRNG; tests and simulations pass a seeded generator instead.
 * Presentation-only randomness (filler symbols on spinning reels, particles)
 * uses its own seeded generators and never touches this one.
 */
import { mulberry32, randomSeed, secureRng, type Rng } from '../../../../shared/utils/random';

export type { Rng };

export function createSeededRng(seed: number): Rng {
  return mulberry32(seed);
}

export const liveRng: Rng = secureRng;

export function presentationRng(seed = randomSeed()): Rng {
  return mulberry32(seed);
}

/** Fast weighted picker over a fixed table (cumulative weights, linear scan). */
export function createWeightedPicker<T>(entries: readonly (readonly [T, number])[]): (rng: Rng) => T {
  const items = entries.filter(([, weight]) => weight > 0);
  if (items.length === 0) throw new Error('Weighted table has no positive weights');
  const cumulative: number[] = [];
  let total = 0;
  for (const [, weight] of items) {
    total += weight;
    cumulative.push(total);
  }
  return (rng) => {
    const roll = rng() * total;
    for (let i = 0; i < cumulative.length; i++) if (roll < cumulative[i]) return items[i][0];
    return items[items.length - 1][0];
  };
}
