import { useAnimatedNumber } from '../../../../shared/hooks/useAnimatedNumber';
import { useCredits, useT } from '../../i18n';
import { selectDisplayedBalance } from '../../state/selectors';
import { useSlot } from '../../state/store';

/** The Cosmic Spin wallet. Counts up when a revealed win lands; the real balance was settled when the spin started. */
export function BalanceDisplay({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const credits = useCredits();
  const balance = useSlot(selectDisplayedBalance);
  const shown = useAnimatedNumber(balance, 700);
  return (
    <div className={`cs-meter cs-meter--balance${compact ? ' is-compact' : ''}`}>
      <span className="cs-meter__label">{t('hud.balance')}</span>
      <span className="cs-meter__value" aria-live="off">
        {credits(shown)}
      </span>
    </div>
  );
}
