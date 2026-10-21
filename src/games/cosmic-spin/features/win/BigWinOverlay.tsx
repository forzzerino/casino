import { mascotImage, symbolImage } from '../../assets/manifest';
import { REDUCED_MOTION_PROFILE, SPEED_PROFILES } from '../../game/config/presentation';
import { Sprite } from '../../components/Sprite';
import { useCountUp } from '../../hooks/useCountUp';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useCredits, useT } from '../../i18n';
import { useRuntime } from '../../runtime';
import type { ActiveSpin } from '../../state/gameTypes';
import { useSlot } from '../../state/store';
import { ParticleBurst } from './ParticleBurst';

function BigWinScene({ spin }: { spin: ActiveSpin }) {
  const t = useT();
  const credits = useCredits();
  const { controller, audio } = useRuntime();
  const reduced = useReducedMotion();
  const speed = useSlot((s) => s.settings.speed);
  const profile = reduced ? REDUCED_MOTION_PROFILE : SPEED_PROFILES[speed];
  const tier = spin.outcome.tier === 'mega' || spin.outcome.tier === 'jackpot' ? spin.outcome.tier : 'big';
  const duration = tier === 'big' ? profile.bigWinCountMs : profile.megaWinCountMs;
  const amount = useCountUp(0, spin.outcome.totalWin, duration, {
    finished: spin.presentationSkipped,
    onTick: (value) => audio.play('coinTick', { index: value, intensity: tier === 'big' ? 0.8 : 1 }),
  });
  const done = spin.presentationSkipped || amount >= spin.outcome.totalWin;
  const title = t(`win.${tier}`);

  return (
    <div className={`cs-bigwin is-${tier}`} role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="cs-bigwin__dim" />
      {tier !== 'big' && !reduced && <div className="cs-bigwin__rays" aria-hidden="true" />}
      {tier !== 'big' && !reduced && <div className="cs-bigwin__columns" aria-hidden="true" />}
      {!reduced && <ParticleBurst intensity={tier === 'big' ? 0.7 : 1} waves={tier === 'big' ? 1 : tier === 'mega' ? 4 : 6} />}
      {!reduced && <Sprite effect="coin-burst" durationMs={1_400} className="cs-bigwin__burst" />}
      {tier !== 'big' && !reduced && <img className="cs-bigwin__ufo" src={symbolImage('ufo')} alt="" aria-hidden="true" />}
      <img className="cs-bigwin__mascot" src={mascotImage('big-win')} alt="" aria-hidden="true" />
      <div className="cs-bigwin__content">
        <h2 className="cs-bigwin__title">{title}</h2>
        <div className="cs-bigwin__amount">{credits(amount)}</div>
        {tier === 'jackpot' && (
          <p className="cs-bigwin__note">
            {t('hud.jackpot')}: {credits(spin.outcome.jackpot.amount)}
          </p>
        )}
        <button type="button" className={`cs-button ${done ? 'cs-button--gold' : 'cs-button--ghost'}`} onClick={() => controller.skipPresentation()} autoFocus>
          {spin.presentationSkipped ? t('win.continue') : t('win.skip')}
        </button>
      </div>
    </div>
  );
}

/** Big, Mega and Jackpot celebrations. Skipping only completes the show — the win was credited before the reels stopped. */
export function BigWinOverlay() {
  const spin = useSlot((s) => (s.phase === 'showingBigWin' ? s.spin : null));
  return spin ? <BigWinScene key={spin.id} spin={spin} /> : null;
}
