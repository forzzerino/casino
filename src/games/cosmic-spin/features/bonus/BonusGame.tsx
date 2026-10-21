import type { CSSProperties } from 'react';
import { backgroundImage, mascotImage, symbolImage } from '../../assets/manifest';
import type { SymbolId } from '../../game/config/symbols';
import { resolveBonusReward } from '../../game/engine/bonusEngine';
import type { BonusReward } from '../../game/types';
import { Sprite } from '../../components/Sprite';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useCredits, useT, type Translate } from '../../i18n';
import { useRuntime } from '../../runtime';
import { useSlot } from '../../state/store';

/** Decorative icons etched into the capsules — they say nothing about the contents. */
const CAPSULE_ICONS: readonly SymbolId[] = ['ufo', 'core', 'crystal', 'rocket', 'star'];

function rewardTitle(reward: BonusReward, t: Translate): string {
  switch (reward.kind) {
    case 'betMultiple':
      return t('reward.betMultiple', { multiple: reward.multiple });
    case 'boost':
      return t('reward.boost');
    case 'freeSpins':
      return t('reward.freeSpins', { spins: reward.spins });
    case 'credits':
      return t('reward.credits');
    case 'treasure':
      return t('reward.treasure');
  }
}

function RewardCard({ reward, bet, primary }: { reward: BonusReward; bet: number; primary: boolean }) {
  const t = useT();
  const credits = useCredits();
  const payout = resolveBonusReward(reward, bet);
  return (
    <div className={`cs-reward is-${reward.kind}${primary ? ' is-primary' : ''}`}>
      <span className="cs-reward__title">{rewardTitle(reward, t)}</span>
      {payout.credits > 0 && <strong className="cs-reward__amount">{credits(payout.credits)}</strong>}
      {payout.multiplier > 1 && primary && (
        <span className="cs-reward__breakdown">
          {t('reward.breakdown', { base: credits(payout.base), multiplier: `×${payout.multiplier}`, total: credits(payout.credits) })}
        </span>
      )}
    </div>
  );
}

/** Bonus Capsules: pick one of five; only that capsule's (pre-drawn) reward is paid. */
export function BonusGame() {
  const t = useT();
  const credits = useCredits();
  const { controller, audio } = useRuntime();
  const reduced = useReducedMotion();
  const phase = useSlot((s) => s.phase);
  const bonus = useSlot((s) => s.bonus);
  const followedByFreeSpins = useSlot((s) => s.freeSpins?.status === 'pending');
  if (!bonus || !phase.startsWith('bonus')) return null;

  const choosing = phase === 'bonusChoosing';
  const revealed = phase === 'bonusResult';
  const picked = bonus.pickedIndex;
  const payout = bonus.payout;

  return (
    <div className={`cs-bonus is-${phase}`} role="dialog" aria-modal="true" aria-labelledby="cs-bonus-title">
      <img
        className="cs-bonus__scene"
        src={backgroundImage('bonus-station', false)}
        srcSet={`${backgroundImage('bonus-station', true)} 960w, ${backgroundImage('bonus-station', false)} 1672w`}
        sizes="100vw"
        alt=""
        aria-hidden="true"
      />
      {phase === 'bonusIntro' ? (
        <button type="button" className="cs-bonus__intro" onClick={() => controller.continueFeature()} autoFocus>
          <img className="cs-bonus__intro-ufo" src={symbolImage('bonus')} alt="" aria-hidden="true" />
          <span id="cs-bonus-title" className="cs-bonus__title">
            {t('bonus.title')}
          </span>
        </button>
      ) : (
        <>
          <header className="cs-bonus__header">
            <h2 id="cs-bonus-title" className="cs-bonus__title">
              {t('bonus.title')}
            </h2>
            <p className="cs-bonus__subtitle">{revealed ? t('bonus.couldHave') : t('bonus.subtitle')}</p>
          </header>
          <ol className="cs-bonus__capsules">
            {bonus.capsules.map((reward, index) => {
              const isPicked = picked === index;
              const state = picked === null ? 'closed' : isPicked ? 'picked' : 'other';
              return (
                <li key={index} className={`cs-capsule is-${state}`} style={{ '--capsule': index } as CSSProperties}>
                  <button
                    type="button"
                    className="cs-capsule__shell"
                    onClick={() => {
                      audio.play('click');
                      controller.pickCapsule(index);
                    }}
                    disabled={!choosing}
                    aria-label={t('bonus.capsule', { n: index + 1 })}
                    autoFocus={choosing && index === 0}
                  >
                    <span className="cs-capsule__cap is-top" aria-hidden="true" />
                    <span className="cs-capsule__glass" aria-hidden="true">
                      <img className="cs-capsule__icon" src={symbolImage(CAPSULE_ICONS[index % CAPSULE_ICONS.length])} alt="" />
                      <span className="cs-capsule__core" />
                    </span>
                    <span className="cs-capsule__cap is-bottom" aria-hidden="true" />
                  </button>
                  {isPicked && !reduced && phase === 'bonusReveal' && <Sprite effect="gold-sparkle" durationMs={1_200} className="cs-capsule__burst" />}
                  {(revealed || (isPicked && phase !== 'bonusChoosing')) && (
                    <RewardCard reward={reward} bet={bonus.bet} primary={isPicked} />
                  )}
                </li>
              );
            })}
          </ol>
          {revealed && payout && (
            <div className="cs-bonus__result" role="status">
              <img className="cs-bonus__mascot" src={mascotImage('happy')} alt="" aria-hidden="true" />
              <div>
                <span className="cs-bonus__won">{t('bonus.youWon')}</span>
                <strong className="cs-bonus__won-amount">
                  {payout.credits > 0 ? credits(payout.credits) : t('reward.freeSpins', { spins: payout.freeSpins })}
                </strong>
                {followedByFreeSpins && <span className="cs-bonus__next">{t('bonus.followFs')}</span>}
              </div>
              <button type="button" className="cs-button cs-button--gold cs-button--large" onClick={() => controller.continueFeature()} autoFocus>
                {t('bonus.continue')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
