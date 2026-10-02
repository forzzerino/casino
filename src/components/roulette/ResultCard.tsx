import { isEven, isLow, numberColor } from '../../game/roulette/numbers';
import { useT } from '../../hooks/useT';
import type { TranslationKey } from '../../i18n';
import { useGameStore } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import { formatSignedUSD, formatUSD } from '../../utils/format';

function attributeKeys(n: number): TranslationKey[] {
  if (n === 0) return ['color.green', 'result.zero'];
  return [`color.${numberColor(n)}` as TranslationKey, isEven(n) ? 'result.even' : 'result.odd', isLow(n) ? 'result.low' : 'result.high'];
}

/** Compact result plate under the phase banner — number, attributes and what it meant for the player. */
export function ResultCard() {
  const t = useT();
  const phase = useGameStore((s) => s.gamePhase);
  const result = useGameStore((s) => s.resultNumber);
  const settlement = useGameStore((s) => s.settlement);
  const roundId = useGameStore((s) => s.roundId);

  const visible = result !== null && (phase === GamePhase.RESULT || phase === GamePhase.PAYOUT || phase === GamePhase.IDLE);
  if (!visible || result === null) return null;

  const color = numberColor(result);
  let outcome = <span className="result-card__outcome is-neutral">{t('result.noBets')}</span>;
  if (settlement && settlement.wagered > 0) {
    outcome =
      settlement.returned > 0 ? (
        <span className="result-card__outcome is-win">
          {t('result.youWon')} <strong>{formatUSD(settlement.returned)}</strong>
          <em>{formatSignedUSD(settlement.net)}</em>
        </span>
      ) : (
        <span className="result-card__outcome is-loss">
          {t('result.noWin')} <em>{formatSignedUSD(settlement.net)}</em>
        </span>
      );
  }

  return (
    <div className={`result-card panel result-card--${color}`} key={roundId} role="status" aria-live="assertive">
      <div className={`result-card__number result-card__number--${color}`}>{result}</div>
      <div className="result-card__body">
        <span className="result-card__attrs">
          {attributeKeys(result).map((key, i) => (
            <span key={key}>
              {i > 0 && <i aria-hidden="true">·</i>}
              {t(key)}
            </span>
          ))}
        </span>
        {outcome}
      </div>
    </div>
  );
}
