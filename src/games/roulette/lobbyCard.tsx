/**
 * Lobby presentation of the roulette game. Kept free of the 3D scene and the
 * store so the lobby can show it without loading the game itself.
 */
import './lobbyCard.css';

import type { LobbyCard } from '../../shared/shell/gameEntry';
import { numberColor } from './game/roulette/numbers';
import { POCKET_COUNT, WHEEL_ORDER } from './game/roulette/wheel';

const R_OUTER = 96;
const R_INNER = 70;
const POCKET_FILL = { red: '#8f2a25', black: '#18181b', green: '#1e6a45' } as const;

function polar(radius: number, angle: number): string {
  return `${(radius * Math.sin(angle)).toFixed(2)} ${(-radius * Math.cos(angle)).toFixed(2)}`;
}

function pocketPath(index: number): string {
  const step = (Math.PI * 2) / POCKET_COUNT;
  const a0 = (index - 0.5) * step;
  const a1 = (index + 0.5) * step;
  return `M${polar(R_INNER, a0)} L${polar(R_OUTER, a0)} A${R_OUTER} ${R_OUTER} 0 0 1 ${polar(R_OUTER, a1)} L${polar(R_INNER, a1)} A${R_INNER} ${R_INNER} 0 0 0 ${polar(R_INNER, a0)}Z`;
}

function RouletteCardArt() {
  const step = 360 / POCKET_COUNT;
  return (
    <div className="roulette-card-art" aria-hidden="true">
      <svg className="roulette-card-art__wheel" viewBox="-112 -112 224 224">
        <circle r="110" fill="#2b1d12" />
        <circle r="104" fill="none" stroke="#c9a96a" strokeWidth="2.2" />
        <g className="roulette-card-art__rotor">
          {WHEEL_ORDER.map((n, index) => (
            <path key={n} d={pocketPath(index)} fill={POCKET_FILL[numberColor(n)]} stroke="#c9a96a" strokeWidth="0.5" />
          ))}
          {WHEEL_ORDER.map((n, index) => (
            <text key={n} className="roulette-card-art__number" transform={`rotate(${index * step}) translate(0 -86)`}>
              {n}
            </text>
          ))}
          <circle r={R_INNER} fill="#3a2716" stroke="#c9a96a" strokeWidth="1.2" />
          <circle r="44" fill="#24180e" />
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x="-2" y="-58" width="4" height="116" rx="2" fill="#c9a96a" transform={`rotate(${k * 45})`} />
          ))}
          <circle r="11" fill="#e3c78d" />
        </g>
        <circle className="roulette-card-art__ball" cx="0" cy="-100" r="4.2" fill="#f1ece1" />
      </svg>
    </div>
  );
}

export const rouletteCard: LobbyCard = {
  title: { tr: 'Avrupa Ruleti', en: 'European Roulette' },
  genre: { tr: '3D Masa Oyunu · Tek Sıfır', en: '3D Table Game · Single Zero' },
  tagline: {
    tr: 'Loş ışıklar, yeşil çuha ve gerçekçi fiziğiyle dönen bir çark.',
    en: 'Low light, green felt and a wheel with true-to-life ball physics.',
  },
  Art: RouletteCardArt,
  accent: '#c9a96a',
};
