import type { ComponentType } from 'react';
import type { Language } from '../i18n/language';

/** Text a game shows on its lobby card, in every supported language. */
export type LocalizedText = Readonly<Record<Language, string>>;

/**
 * Lightweight, eagerly loaded description of a game for the lobby. Everything
 * heavy (3D scene, artwork, audio) stays behind `load`.
 */
export interface LobbyCard {
  readonly title: LocalizedText;
  readonly genre: LocalizedText;
  readonly tagline: LocalizedText;
  /** Decorative card artwork; must not pull in the game's runtime. */
  readonly Art: ComponentType;
  /** Accent colour for the card glow and button. */
  readonly accent: string;
}

export interface GameEntry {
  /** Also the URL hash route: `#/<id>`. */
  readonly id: string;
  readonly card: LobbyCard;
  /** Code-split entry point; the module's default export is the game's root component. */
  readonly load: () => Promise<{ default: ComponentType }>;
}
