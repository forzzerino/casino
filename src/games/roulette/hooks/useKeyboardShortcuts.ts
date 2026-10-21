import { useEffect } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import { gameEvents } from '../game/events';
import { useGameStore } from '../state/gameStore';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Esc: pause / resume · Space/Enter: place bet · Ctrl+Z / Backspace: undo ·
 * 1–6: chip · D: double · R: repeat. Only Esc works while paused.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const s = useGameStore.getState();
      if (!s.hasEntered) return;

      // Checked before the typing guard so Esc also works while a slider has focus.
      if (event.key === 'Escape') {
        event.preventDefault();
        s.togglePause();
        gameEvents.emit('uiClick', { variant: 'toggle' });
        return;
      }
      if (s.paused || isTyping(event.target)) return;
      const onButton = event.target instanceof HTMLButtonElement;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        s.undo();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key) {
        case ' ':
        case 'Enter':
          if (onButton) return;
          event.preventDefault();
          s.placeBet();
          return;
        case 'Backspace':
          event.preventDefault();
          s.undo();
          return;
        case 'd':
        case 'D':
          s.doubleBets();
          return;
        case 'r':
        case 'R':
          s.repeatBets();
          return;
        default: {
          const index = Number(event.key) - 1;
          const chip = GAME_CONFIG.chipDenominations[index];
          if (Number.isInteger(index) && chip !== undefined) s.selectChip(chip);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
