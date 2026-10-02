import { describeSpot } from '../../i18n/describeSpot';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { selectAmountOnSelected, selectIsBetting } from '../../state/selectors';
import { formatUSD } from '../../utils/format';
import { Icon } from '../ui/Icon';

/** One line telling the player exactly what BET will do. */
export function SelectionInfo() {
  const t = useT();
  const language = useGameStore((s) => s.language);
  const spot = useGameStore((s) => s.selectedSpot);
  const amount = useGameStore(selectAmountOnSelected);
  const betting = useGameStore(selectIsBetting);

  if (!spot) {
    return (
      <div className="selection-info is-empty">
        <Icon name="info" width={15} height={15} />
        <span>{betting ? t('selection.none') : t('selection.closed')}</span>
      </div>
    );
  }

  const d = describeSpot(spot, language);
  return (
    <div className={`selection-info${betting ? '' : ' is-closed'}`}>
      <span className="selection-info__name">{d.name}</span>
      {d.detail && <span className="selection-info__detail">{d.detail}</span>}
      <span className="selection-info__sep" aria-hidden="true" />
      <span className="selection-info__pays">
        {t('selection.pays')} {d.payout}
      </span>
      {amount > 0 && (
        <>
          <span className="selection-info__sep" aria-hidden="true" />
          <span className="selection-info__amount">
            {t('selection.onSpot')} <strong>{formatUSD(amount)}</strong>
          </span>
        </>
      )}
    </div>
  );
}
