import type { Dictionaries } from '../shared/i18n/translate';

const tr = {
  'lobby.documentTitle': 'Oyun Salonu',
  'lobby.eyebrow': 'Sanal Kumarhane',
  'lobby.title': 'Oyun Salonu',
  'lobby.intro': 'Bir masa seçin. Her oyunun kendi bakiyesi vardır; birinde kazandığınız diğerine taşınmaz.',
  'lobby.play': 'Oyna',
  'lobby.games': 'Oyunlar',
  'lobby.language': 'Dil',
  'lobby.virtualNote': 'Yalnızca sanal kredi ile oynanır. Gerçek para, yatırma veya çekme yoktur.',
};

const en: Record<keyof typeof tr, string> = {
  'lobby.documentTitle': 'Game Lounge',
  'lobby.eyebrow': 'Virtual Casino',
  'lobby.title': 'Game Lounge',
  'lobby.intro': 'Pick a table. Every game keeps its own balance — winnings in one never carry over to another.',
  'lobby.play': 'Play',
  'lobby.games': 'Games',
  'lobby.language': 'Language',
  'lobby.virtualNote': 'Played with virtual credits only. No real money, deposits or withdrawals.',
};

export type LobbyKey = keyof typeof tr;
export const LOBBY_DICTIONARIES: Dictionaries<LobbyKey> = { tr, en };
