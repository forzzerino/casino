/** A source of uniformly distributed numbers in [0, 1). */
export type Rng = () => number;

/** Small, fast, seedable PRNG — used where reproducibility matters (spin trajectories, tests). */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cryptoUint32(): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0];
}

/** Unbiased integer in [0, maxExclusive) from the platform CSPRNG (rejection sampling). */
export function secureRandomInt(maxExclusive: number): number {
  const range = 2 ** 32;
  const limit = range - (range % maxExclusive);
  let value = cryptoUint32();
  while (value >= limit) value = cryptoUint32();
  return value % maxExclusive;
}

export function randomSeed(): number {
  return cryptoUint32();
}

/** Uniform [0, 1) from the platform CSPRNG — for outcomes that must not be predictable. */
export const secureRng: Rng = () => cryptoUint32() / 4294967296;

export function rngRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function rngInt(rng: Rng, min: number, maxInclusive: number): number {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function rngChance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

export function rngWeighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}

export function rngShuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
