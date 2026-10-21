import { LANGUAGES, useLanguageStore } from '../../../../shared/i18n/language';
import { useT } from '../../hooks/useT';
import { HudButton } from './HudButton';

export function LanguageToggle() {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
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
