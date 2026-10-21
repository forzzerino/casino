/**
 * Lobby presentation of Cosmic Spin: artwork and copy only, no game runtime.
 */
import '@fontsource/baloo-2/800.css';
import './lobbyCard.css';

import type { LobbyCard } from '../../shared/shell/gameEntry';
import { backgroundImage, mascotImage, symbolImage } from './assets/manifest';
import { Logo } from './components/Logo';

function CosmicSpinCardArt() {
  return (
    <div className="cosmic-card-art" aria-hidden="true">
      <img className="cosmic-card-art__bg" src={backgroundImage('base-space', true)} alt="" loading="lazy" />
      <img className="cosmic-card-art__symbol is-left" src={symbolImage('scatter')} alt="" loading="lazy" />
      <img className="cosmic-card-art__symbol is-right" src={symbolImage('wild')} alt="" loading="lazy" />
      <img className="cosmic-card-art__mascot" src={mascotImage('happy')} alt="" loading="lazy" />
      <div className="cosmic-card-art__logo">
        <Logo size="medium" />
      </div>
    </div>
  );
}

export const cosmicSpinCard: LobbyCard = {
  title: { tr: 'Cosmic Spin', en: 'Cosmic Spin' },
  genre: { tr: '5×3 Slot · 20 Hat', en: '5×3 Slot · 20 Paylines' },
  tagline: {
    tr: 'Komik uzaylılar, altın semboller, Free Spin, bonus kapsülleri ve kozmik jackpot.',
    en: 'Cheeky aliens, golden symbols, Free Spins, bonus capsules and a cosmic jackpot.',
  },
  Art: CosmicSpinCardArt,
  accent: '#ffc247',
};
