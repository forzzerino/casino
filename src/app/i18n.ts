import type { Dictionaries } from '../shared/i18n/translate';

const tr = {
  'shell.loading': 'Oyun yükleniyor…',
  'shell.loadError': 'Oyun yüklenemedi',
  'shell.loadErrorDetail': 'Bağlantınızı kontrol edip yeniden deneyin.',
  'shell.retry': 'Yeniden Dene',
  'shell.backToLobby': 'Lobiye Dön',
};

const en: Record<keyof typeof tr, string> = {
  'shell.loading': 'Loading game…',
  'shell.loadError': 'The game could not be loaded',
  'shell.loadErrorDetail': 'Check your connection and try again.',
  'shell.retry': 'Try Again',
  'shell.backToLobby': 'Back to Lobby',
};

export type ShellKey = keyof typeof tr;
export const SHELL_DICTIONARIES: Dictionaries<ShellKey> = { tr, en };
