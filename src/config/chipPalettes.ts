/**
 * Chip colour language shared by the HTML chip selector and the 3D chips, so a
 * $100 chip looks the same in the HUD as on the felt.
 */

export interface ChipPalette {
  /** Main body colour. */
  readonly base: string;
  /** Edge-spot / stripe colour. */
  readonly accent: string;
  /** Centre inlay behind the value. */
  readonly inlay: string;
  /** Value text colour. */
  readonly text: string;
}

const DENOMINATION_PALETTES: Readonly<Record<number, ChipPalette>> = {
  1: { base: '#e6e0d2', accent: '#3f5f8c', inlay: '#f6f2e9', text: '#2b3a57' },
  5: { base: '#9a2a24', accent: '#efe5d2', inlay: '#f4ede0', text: '#7a1f1a' },
  25: { base: '#2b6a47', accent: '#efe5d2', inlay: '#f4ede0', text: '#21553a' },
  100: { base: '#1c1c20', accent: '#c9a96a', inlay: '#f1ebde', text: '#1c1c20' },
  500: { base: '#58397a', accent: '#efe5d2', inlay: '#f3ecf3', text: '#4a2f68' },
  1000: { base: '#c18d2e', accent: '#2a1d0c', inlay: '#f7efdd', text: '#6a4610' },
};

/** Used for any denomination added to the config without a dedicated palette. */
const FALLBACK_PALETTES: readonly ChipPalette[] = [
  { base: '#3b5d7a', accent: '#efe5d2', inlay: '#f1ede4', text: '#2c465c' },
  { base: '#7a4a2a', accent: '#efe5d2', inlay: '#f4ede0', text: '#5c371f' },
  { base: '#4a4f57', accent: '#d9c08a', inlay: '#f1ede4', text: '#30343a' },
];

export function chipPaletteForDenomination(value: number, denominations: readonly number[]): ChipPalette {
  const palette = DENOMINATION_PALETTES[value];
  if (palette) return palette;
  const index = Math.max(0, denominations.indexOf(value));
  return FALLBACK_PALETTES[index % FALLBACK_PALETTES.length];
}

/** A consolidated stack takes the colour of the largest denomination it contains. */
export function chipPaletteForAmount(amount: number, denominations: readonly number[]): ChipPalette {
  let tier = denominations[0] ?? 1;
  for (const value of denominations) {
    if (value <= amount) tier = value;
  }
  return chipPaletteForDenomination(tier, denominations);
}

/** Bots play coloured "wheel chips" so their bets are distinguishable from the player's. */
export function botChipPalette(color: string): ChipPalette {
  return { base: color, accent: '#f1e9da', inlay: '#f1e9da', text: color };
}
