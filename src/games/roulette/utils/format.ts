const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdWholeFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** $10,000.00 */
export function formatUSD(value: number): string {
  return usdFormatter.format(value);
}

/** $10,000 — for compact HUD labels where cents never occur. */
export function formatUSDWhole(value: number): string {
  return usdWholeFormatter.format(value);
}

/** +$350.00 / −$50.00 */
export function formatSignedUSD(value: number): string {
  if (value === 0) return formatUSD(0);
  const sign = value > 0 ? '+' : '−';
  return `${sign}${formatUSD(Math.abs(value))}`;
}

function trimDecimals(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/** Value printed on a physical chip: 25, 500, 1K, 1.25K, 12.5K. */
export function formatChipLabel(value: number): string {
  if (value >= 1_000_000) return `${trimDecimals(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimDecimals(value / 1_000)}K`;
  return trimDecimals(value);
}
