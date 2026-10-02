import { groupIndexOf, PAYOUT_RATIOS } from '../game/betting/betSpots';
import { BetType, type BetSpot } from '../types/game';
import type { Language } from '../types/ui';
import { ordinal, translate } from './index';

export interface SpotDescription {
  /** "Split", "Köşe", "2. Düzine" */
  readonly name: string;
  /** "17 / 20", "1 – 12" */
  readonly detail: string;
  /** "17:1" */
  readonly payout: string;
}

function rangeDetail(numbers: readonly number[]): string {
  return `${numbers[0]} – ${numbers[numbers.length - 1]}`;
}

export function describeSpot(spot: BetSpot, language: Language): SpotDescription {
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(language, key, params);
  const payout = `${PAYOUT_RATIOS[spot.type]}:1`;
  const nums = spot.numbers;

  switch (spot.type) {
    case BetType.STRAIGHT:
      return { name: t('bet.STRAIGHT'), detail: String(nums[0]), payout };
    case BetType.SPLIT:
      return { name: t('bet.SPLIT'), detail: nums.join(' / '), payout };
    case BetType.STREET:
      return { name: t(nums[0] === 0 ? 'bet.TRIO' : 'bet.STREET'), detail: nums.join(' · '), payout };
    case BetType.CORNER:
      return { name: t(nums[0] === 0 ? 'bet.FIRST_FOUR' : 'bet.CORNER'), detail: nums.join(' · '), payout };
    case BetType.SIX_LINE:
      return { name: t('bet.SIX_LINE'), detail: rangeDetail(nums), payout };
    case BetType.DOZEN:
      return { name: t('bet.DOZEN', { n: ordinal(language, groupIndexOf(spot)) }), detail: rangeDetail(nums), payout };
    case BetType.COLUMN:
      return { name: t('bet.COLUMN', { n: ordinal(language, groupIndexOf(spot)) }), detail: '2:1', payout };
    default:
      return { name: t(`bet.${spot.type}`), detail: '', payout };
  }
}

/** Compact one-line label: "Split 17/20", "Red", "2nd Dozen". */
export function shortSpotLabel(spot: BetSpot, language: Language): string {
  const d = describeSpot(spot, language);
  if (spot.type === BetType.STRAIGHT) return d.detail;
  if (spot.type === BetType.SPLIT) return `${d.name} ${spot.numbers.join('/')}`;
  if (spot.type === BetType.DOZEN || spot.type === BetType.COLUMN) return d.name;
  if (d.detail && spot.type !== BetType.RED && spot.type !== BetType.BLACK) return `${d.name} ${d.detail}`;
  return d.name;
}
