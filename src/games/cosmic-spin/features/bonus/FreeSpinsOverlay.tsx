import { mascotImage } from '../../assets/manifest';
import { Sprite } from '../../components/Sprite';
import { useCountUp } from '../../hooks/useCountUp';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useCredits, useT } from '../../i18n';
import { useRuntime } from '../../runtime';
import { useSlot } from '../../state/store';

function Intro() {
  const t = useT();
  const { controller } = useRuntime();
  const reduced = useReducedMotion();
  const session = useSlot((s) => s.freeSpins);
  const autoplay = useSlot((s) => s.autoplay !== null);
  if (!session) return null;
  const resuming = session.played > 0;
  const remaining = session.remaining;
  return (
    <div className="cs-feature is-free-spins" role="dialog" aria-modal="true" aria-labelledby="cs-fs-title">
      {!reduced && <Sprite effect="scatter-burst" durationMs={1_600} className="cs-feature__burst" />}
      <img className="cs-feature__mascot" src={mascotImage('surprised')} alt="" aria-hidden="true" />
      <div className="cs-feature__card">
        <h2 id="cs-fs-title" className="cs-feature__title">
          {t('fs.title')}
        </h2>
        <p className="cs-feature__big">{resuming ? t('fs.resume', { n: remaining }) : t('fs.awarded', { n: remaining })}</p>
        <p className="cs-feature__note">{t('fs.rules')}</p>
        <button type="button" className="cs-button cs-button--gold cs-button--large" onClick={() => controller.continueFeature()} autoFocus>
          {t('fs.start')}
        </button>
        {autoplay && <p className="cs-feature__hint">{t('fs.autoStart')}</p>}
      </div>
    </div>
  );
}

function Outro() {
  const t = useT();
  const credits = useCredits();
  const { controller, audio } = useRuntime();
  const session = useSlot((s) => s.freeSpins);
  const total = useCountUp(0, session?.totalWin ?? 0, 1_600, { onTick: (v) => audio.play('coinTick', { index: v, intensity: 0.7 }) });
  if (!session) return null;
  return (
    <div className="cs-feature is-free-spins-outro" role="dialog" aria-modal="true" aria-labelledby="cs-fs-outro-title">
      <img className="cs-feature__mascot" src={mascotImage(session.totalWin > 0 ? 'happy' : 'losing')} alt="" aria-hidden="true" />
      <div className="cs-feature__card">
        <h2 id="cs-fs-outro-title" className="cs-feature__title">
          {t('fs.outroTitle')}
        </h2>
        <p className="cs-feature__label">{t('fs.outroWin')}</p>
        <p className="cs-feature__amount">{credits(total)}</p>
        <p className="cs-feature__note">{t('fs.played', { n: session.played })}</p>
        <button type="button" className="cs-button cs-button--gold cs-button--large" onClick={() => controller.continueFeature()} autoFocus>
          {t('fs.continue')}
        </button>
      </div>
    </div>
  );
}

export function FreeSpinsOverlay() {
  const phase = useSlot((s) => s.phase);
  if (phase === 'freeSpinsIntro') return <Intro />;
  if (phase === 'freeSpinsOutro') return <Outro />;
  return null;
}
