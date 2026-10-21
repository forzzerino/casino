import './lobby.css';

import { useEffect, type CSSProperties } from 'react';
import { routeHref } from '../app/router';
import { GAMES } from '../games/registry';
import { LANGUAGES, useLanguageStore, type Language } from '../shared/i18n/language';
import { useTranslator, type Translator } from '../shared/i18n/translate';
import type { GameEntry } from '../shared/shell/gameEntry';
import { LOBBY_DICTIONARIES, type LobbyKey } from './i18n';

function LanguageSwitch({ t }: { t: Translator<LobbyKey> }) {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  return (
    <div className="lobby-language" role="group" aria-label={t('lobby.language')}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          className={`lobby-language__option${language === lang ? ' is-active' : ''}`}
          aria-pressed={language === lang}
          onClick={() => setLanguage(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function GameCard({ game, language, playLabel }: { game: GameEntry; language: Language; playLabel: string }) {
  const { title, genre, tagline, Art, accent } = game.card;
  return (
    <li className="lobby-card" style={{ '--card-accent': accent } as CSSProperties}>
      <a className="lobby-card__link" href={routeHref(game.id)} aria-label={`${title[language]} — ${playLabel}`}>
        <div className="lobby-card__art">
          <Art />
        </div>
        <div className="lobby-card__body">
          <span className="lobby-card__genre">{genre[language]}</span>
          <h2 className="lobby-card__title">{title[language]}</h2>
          <p className="lobby-card__tagline">{tagline[language]}</p>
          <span className="lobby-card__cta" aria-hidden="true">
            {playLabel}
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </a>
    </li>
  );
}

/** The shared project screen: pick a game. It holds no game state — every game keeps its own wallet. */
export function Lobby() {
  const t = useTranslator(LOBBY_DICTIONARIES);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    document.title = t('lobby.documentTitle');
  }, [t]);

  return (
    <div className="lobby">
      <header className="lobby__header">
        <div className="lobby__brand">
          <svg className="lobby__mark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 3 37 20 20 37 3 20Z" />
            <path d="M20 11 29 20 20 29 11 20Z" />
          </svg>
          <div className="lobby__brand-text">
            <span className="lobby__eyebrow">{t('lobby.eyebrow')}</span>
            <h1 className="lobby__title">{t('lobby.title')}</h1>
          </div>
        </div>
        <LanguageSwitch t={t} />
      </header>

      <main className="lobby__main">
        <p className="lobby__intro">{t('lobby.intro')}</p>
        <ul className="lobby__games" aria-label={t('lobby.games')}>
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} language={language} playLabel={t('lobby.play')} />
          ))}
        </ul>
      </main>

      <footer className="lobby__footer">{t('lobby.virtualNote')}</footer>
    </div>
  );
}
