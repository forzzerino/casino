import { useT } from '../../hooks/useT';
import type { TranslationKey } from '../../i18n';
import { useGameStore } from '../../state/gameStore';
import type { SoundSettings } from '../../types/ui';
import { HudButton } from './HudButton';
import { Icon } from './Icon';

type VolumeKey = Exclude<keyof SoundSettings, 'muted'>;

const CHANNELS: readonly { key: VolumeKey; label: TranslationKey }[] = [
  { key: 'master', label: 'sound.master' },
  { key: 'music', label: 'sound.music' },
  { key: 'effects', label: 'sound.effects' },
  { key: 'ambient', label: 'sound.ambient' },
];

/** Mute toggle plus one slider per audio bus — shared by the top-bar popover and the pause screen. */
export function SoundMixer() {
  const t = useT();
  const settings = useGameStore((s) => s.soundSettings);
  const setSoundSettings = useGameStore((s) => s.setSoundSettings);

  return (
    <div className="sound-mixer">
      <HudButton
        variant="ghost"
        sound="toggle"
        active={settings.muted}
        onClick={() => setSoundSettings({ muted: !settings.muted })}
        className="sound-mixer__mute"
      >
        <Icon name={settings.muted ? 'sound' : 'mute'} />
        {settings.muted ? t('sound.unmute') : t('sound.mute')}
      </HudButton>
      {CHANNELS.map(({ key, label }) => (
        <label key={key} className={`slider-row${settings.muted ? ' is-muted' : ''}`}>
          <span className="slider-row__label">{t(label)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings[key]}
            onChange={(event) => setSoundSettings({ [key]: Number(event.target.value) })}
          />
          <span className="slider-row__value">{Math.round(settings[key] * 100)}</span>
        </label>
      ))}
    </div>
  );
}
