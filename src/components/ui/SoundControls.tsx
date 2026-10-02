import { useEffect, useRef, useState } from 'react';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { HudButton } from './HudButton';
import { Icon } from './Icon';
import { SoundMixer } from './SoundMixer';

/** Top-bar sound button with a compact mixer popover. */
export function SoundControls() {
  const t = useT();
  const muted = useGameStore((s) => s.soundSettings.muted);
  const paused = useGameStore((s) => s.paused);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  // The pause screen has its own mixer; never show both.
  const visible = open && !paused;

  return (
    <div className="sound-controls" ref={rootRef}>
      <HudButton
        variant="segment"
        sound="toggle"
        active={visible}
        onClick={() => setOpen(!open)}
        aria-expanded={visible}
        aria-label={t('sound.title')}
        title={t('sound.title')}
      >
        <Icon name={muted ? 'mute' : 'sound'} />
      </HudButton>
      {visible && (
        <div className="popover sound-popover" role="dialog" aria-label={t('sound.title')}>
          <div className="popover__header">
            <span className="eyebrow">{t('sound.title')}</span>
          </div>
          <SoundMixer />
        </div>
      )}
    </div>
  );
}
