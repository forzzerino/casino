import type { BotLogEntry, BotPlayer } from '../../game/bots/botBrain';
import { shortSpotLabel } from '../../i18n/describeSpot';
import { useT } from '../../hooks/useT';
import type { Translate } from '../../i18n';
import { useGameStore } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import type { Language } from '../../types/ui';
import { formatSignedUSD, formatUSDWhole } from '../../utils/format';

const VISIBLE_ENTRIES = 3;

function entryLine(entry: BotLogEntry, language: Language, t: Translate): { amount: number; label: string } {
  if (entry.kind === 'neighbours') {
    return {
      amount: entry.amountEach * (entry.range * 2 + 1),
      label: t('bots.neighbours', { center: entry.center, range: entry.range }),
    };
  }
  return { amount: entry.amount, label: shortSpotLabel(entry.spot, language) };
}

function BotRow({ bot, phase, language, t }: { bot: BotPlayer; phase: GamePhase; language: Language; t: Translate }) {
  const entries = bot.log.slice(-VISIBLE_ENTRIES);
  const hidden = bot.log.length - entries.length;
  const showNet = bot.lastNet !== null && (phase === GamePhase.RESULT || phase === GamePhase.PAYOUT || phase === GamePhase.IDLE);

  return (
    <li className="bot">
      <div className="bot__head">
        <span className="bot__chip" style={{ background: bot.color }} aria-hidden="true" />
        <span className="bot__name">{bot.name}</span>
        <span className="bot__profile">{t(`bots.profile.${bot.profile}`)}</span>
        {showNet && bot.lastNet !== null ? (
          <span className={`bot__net${bot.lastNet > 0 ? ' is-win' : bot.lastNet < 0 ? ' is-loss' : ''}`}>
            {formatSignedUSD(bot.lastNet)}
          </span>
        ) : (
          <span className="bot__balance">{formatUSDWhole(bot.balance)}</span>
        )}
      </div>
      <ul className="bot__bets">
        {entries.length === 0 && (
          <li className="bot__status">{phase === GamePhase.BETTING ? t('bots.thinking') : t('bots.watching')}</li>
        )}
        {entries.map((entry) => {
          const line = entryLine(entry, language, t);
          return (
            <li key={entry.id} className="bot__bet">
              <span className="bot__amount">{formatUSDWhole(line.amount)}</span>
              <span className="bot__arrow" aria-hidden="true">
                →
              </span>
              <span className="bot__target">{line.label}</span>
            </li>
          );
        })}
        {hidden > 0 && <li className="bot__more">+{hidden}</li>}
      </ul>
    </li>
  );
}

/** Lightweight presence of the other players — no avatars, just their play. */
export function BotPanel() {
  const t = useT();
  const bots = useGameStore((s) => s.bots);
  const phase = useGameStore((s) => s.gamePhase);
  const language = useGameStore((s) => s.language);
  return (
    <section className="bots panel" aria-label={t('bots.title')}>
      <header className="panel__header">
        <span className="eyebrow">{t('bots.title')}</span>
      </header>
      <ul className="bots__list">
        {bots.map((bot) => (
          <BotRow key={bot.id} bot={bot} phase={phase} language={language} t={t} />
        ))}
      </ul>
    </section>
  );
}
