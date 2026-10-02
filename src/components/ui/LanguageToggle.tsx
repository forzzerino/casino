import { useT } from '../../hooks/useT';
import { LANGUAGES } from '../../i18n';
import { useGameStore } from '../../state/gameStore';
import { HudButton } from './HudButton';

export function LanguageToggle() {
  const t = useT();
  const language = useGameStore((s) => s.language);
  const setLanguage = useGameStore((s) => s.setLanguage);
  return (
    <div className="segmented segmented--compact" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((lang) => (
        <HudButton
          key={lang}
          variant="segment"
          sound="toggle"
          active={language === lang}
          onClick={() => setLanguage(lang)}
          lang={lang}
        >
          {lang.toUpperCase()}
        </HudButton>
      ))}
    </div>
  );
}
