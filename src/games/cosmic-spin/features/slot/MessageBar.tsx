import type { ReactNode } from 'react';
import { useCredits, useT } from '../../i18n';
import { selectNeedsCredits, selectShownWin } from '../../state/selectors';
import { useDispatch, useSlot } from '../../state/store';
import type { WinStep } from './winSteps';

/** One line under the reels that says what is happening: the win being shown, a hint, or what to do next. */
export function MessageBar({ step }: { step: WinStep | null }) {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const phase = useSlot((s) => s.phase);
  const shownWin = useSlot(selectShownWin);
  const needsCredits = useSlot(selectNeedsCredits);
  const lastSpinWon = useSlot((s) => (s.spin?.revealed ? s.spin.outcome.totalWin > 0 : null));
  const jackpot = useSlot((s) => (s.spin?.revealed && s.spin.outcome.jackpot.triggered ? s.spin.outcome.jackpot.amount : 0));

  let tone: 'neutral' | 'win' | 'feature' | 'alert' = 'neutral';
  let content: ReactNode = t('msg.ready');
  let amount: number | null = null;

  if (phase === 'insufficientBalance') {
    tone = 'alert';
    content = needsCredits ? t('msg.insufficient') : t('msg.lowerBet');
  } else if (phase === 'spinning' || phase === 'reelStopping' || phase === 'evaluating') {
    content = t('msg.goodLuck');
  } else if (step) {
    tone = 'win';
    switch (step.kind) {
      case 'all':
        content = jackpot > 0 ? t('msg.jackpot') : t('hud.win');
        amount = step.amount;
        break;
      case 'line':
        content = step.win.symbol === 'wild'
          ? t('msg.wildLine', { line: step.win.lineId, count: step.win.count })
          : t('msg.line', { line: step.win.lineId, count: step.win.count, symbol: t(`symbol.${step.win.symbol}`) });
        amount = step.win.amount;
        break;
      case 'scatter':
        tone = 'feature';
        content = step.freeSpins > 0 ? t('msg.freeSpinsWon', { n: step.freeSpins }) : t('msg.scatter', { count: step.cells.length });
        amount = step.amount > 0 ? step.amount : null;
        break;
      case 'bonus':
        tone = 'feature';
        content = t('msg.bonus');
        break;
      case 'multiplier':
        tone = 'feature';
        content = t('msg.multiplier', { value: step.value });
        amount = step.amount;
        break;
    }
  } else if (lastSpinWon === false && phase === 'idle') {
    content = t('msg.noWin');
  } else if (shownWin > 0) {
    tone = 'win';
    content = t('hud.win');
    amount = shownWin;
  }

  return (
    <div className={`cs-message is-${tone}`}>
      <span className="cs-message__text">{content}</span>
      {amount !== null && <strong className="cs-message__amount">{credits(amount)}</strong>}
      {phase === 'insufficientBalance' && needsCredits && (
        <button type="button" className="cs-chip-button" onClick={() => dispatch({ type: 'resetCredits' })}>
          {t('msg.resetCredits')}
        </button>
      )}
    </div>
  );
}
