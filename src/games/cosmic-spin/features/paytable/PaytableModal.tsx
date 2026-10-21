import { useMemo } from 'react';
import { SLOT_CONFIG, lineBetFor, maxBetOf } from '../../game/config/gameRules';
import { REGULAR_SYMBOLS, SYMBOL_RARITY } from '../../game/config/symbols';
import { computeTheoreticalRtp } from '../../game/engine/rtp';
import type { LineSymbol } from '../../game/types';
import { Modal } from '../../components/Modal';
import { useCredits, useT } from '../../i18n';
import { useDispatch, useSlot } from '../../state/store';
import { SymbolArt } from '../slot/SymbolArt';

const RARITIES = ['common', 'uncommon', 'rare'] as const;
const BONUS_CREDITS = SLOT_CONFIG.bonus.pool.find((e) => e.reward.kind === 'credits')?.reward;
const TREASURE = SLOT_CONFIG.bonus.pool.find((e) => e.reward.kind === 'treasure')?.reward;

function PayRows({ symbol, lineBet }: { symbol: LineSymbol; lineBet: number }) {
  const credits = useCredits();
  const pays = SLOT_CONFIG.linePays[symbol];
  return (
    <dl className="cs-pays">
      {[5, 4, 3].map((count) => (
        <div key={count} className="cs-pays__row">
          <dt>{count}×</dt>
          <dd>{credits(pays[count - 3] * lineBet)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PaylineDiagram({ id, positions }: { id: number; positions: readonly number[] }) {
  const t = useT();
  return (
    <figure className="cs-line-diagram">
      <svg viewBox="0 0 50 30" role="img" aria-label={t('pay.line', { n: id })}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3, 4].map((reel) => (
            <rect key={`${reel}${row}`} x={reel * 10 + 1} y={row * 10 + 1} width="8" height="8" rx="1.5" className={positions[reel] === row ? 'is-on' : ''} />
          )),
        )}
        <polyline points={positions.map((row, reel) => `${reel * 10 + 5},${row * 10 + 5}`).join(' ')} />
      </svg>
      <figcaption>{id}</figcaption>
    </figure>
  );
}

/** Everything here is read from SLOT_CONFIG — the same object the engine pays from. */
export function PaytableModal() {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const bet = useSlot((s) => s.freeSpins?.bet ?? s.bet);
  const lineBet = lineBetFor(bet);
  const rtp = useMemo(() => computeTheoreticalRtp(SLOT_CONFIG, bet).total, [bet]);
  const scatter = SLOT_CONFIG.scatterPays;
  const awards = SLOT_CONFIG.freeSpins.awards;
  const jackpot = SLOT_CONFIG.jackpot;

  return (
    <Modal title={t('pay.title')} onClose={() => dispatch({ type: 'closeModal' })} size="large">
      <p className="cs-modal__lead">{t('pay.betNote', { bet: credits(bet), lineBet: credits(lineBet) })}</p>

      <h3 className="cs-section-title">{t('pay.regular')}</h3>
      {RARITIES.map((rarity) => (
        <section key={rarity} className="cs-paygroup">
          <h4 className={`cs-rarity is-${rarity}`}>{t(`pay.${rarity}`)}</h4>
          <ul className="cs-paygrid">
            {REGULAR_SYMBOLS.filter((id) => SYMBOL_RARITY[id] === rarity).map((id) => (
              <li key={id} className="cs-paycard">
                <SymbolArt symbol={id} />
                <span className="cs-paycard__name">{t(`symbol.${id}`)}</span>
                <PayRows symbol={id} lineBet={lineBet} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h3 className="cs-section-title">{t('pay.special')}</h3>
      <ul className="cs-rules">
        <li className="cs-rule">
          <SymbolArt symbol="wild" />
          <div>
            <h4>WILD</h4>
            <p>{t('pay.wild')}</p>
            <PayRows symbol="wild" lineBet={lineBet} />
          </div>
        </li>
        <li className="cs-rule">
          <SymbolArt symbol="scatter" />
          <div>
            <h4>SCATTER · {t('fs.title')}</h4>
            <p>{t('pay.scatter', { p3: scatter[3], p4: scatter[4], p5: scatter[5], f3: awards[3], f4: awards[4], f5: awards[5] })}</p>
            <p>{t('pay.freeSpins', { max: SLOT_CONFIG.freeSpins.maxPerSession })}</p>
          </div>
        </li>
        <li className="cs-rule">
          <SymbolArt symbol="multiplier" multiplier={5} />
          <div>
            <h4>{t('symbol.multiplier')}</h4>
            <p>{t('pay.multiplier')}</p>
          </div>
        </li>
        <li className="cs-rule">
          <SymbolArt symbol="bonus" />
          <div>
            <h4>BONUS</h4>
            <p>
              {t('pay.bonus', {
                n: SLOT_CONFIG.bonus.triggerCount,
                credits: credits(BONUS_CREDITS?.kind === 'credits' ? BONUS_CREDITS.amount : 0),
                treasure: TREASURE?.kind === 'treasure' ? TREASURE.multiple : 0,
              })}
            </p>
          </div>
        </li>
        <li className="cs-rule is-jackpot">
          <span className="cs-rule__badge">{t('hud.jackpot')}</span>
          <div>
            <h4>{t('win.jackpot')}</h4>
            <p>
              {t('pay.jackpot', {
                rate: jackpot.contributionRate * 100,
                n: jackpot.triggerWilds,
                max: credits(maxBetOf()),
                seed: credits(jackpot.seed),
              })}
            </p>
          </div>
        </li>
      </ul>

      <h3 className="cs-section-title">{t('pay.lines')}</h3>
      <p>{t('pay.linesNote')}</p>
      <div className="cs-line-grid">
        {SLOT_CONFIG.paylines.map((line) => (
          <PaylineDiagram key={line.id} id={line.id} positions={line.positions} />
        ))}
      </div>
      <p className="cs-modal__fineprint">{t('pay.rtp', { rtp: (rtp * 100).toFixed(1) })}</p>
    </Modal>
  );
}
