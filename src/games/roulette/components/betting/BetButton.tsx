import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { selectCanPlaceBet, selectIsBetting } from '../../state/selectors';
import { formatUSDWhole } from '../../utils/format';
import { HudButton } from '../ui/HudButton';

/** The primary action: places the selected chip on the selected spot. */
export function BetButton() {
  const t = useT();
  const betting = useGameStore(selectIsBetting);
  const ready = useGameStore(selectCanPlaceBet);
  const chip = useGameStore((s) => s.selectedChip);
  const placeBet = useGameStore((s) => s.placeBet);

  return (
    <HudButton
      variant="primary"
      sound="none"
      className={`bet-button${ready ? ' is-ready' : ''}`}
      disabled={!betting}
      onClick={placeBet}
    >
      <span className="bet-button__label">{t('roulette.bet')}</span>
      <span className="bet-button__chip">{formatUSDWhole(chip)}</span>
    </HudButton>
  );
}
