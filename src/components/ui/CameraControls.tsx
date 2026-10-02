import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { CameraMode } from '../../types/ui';
import { HudButton } from './HudButton';
import { Icon, type IconName } from './Icon';

const MODES: readonly { mode: CameraMode; icon: IconName }[] = [
  { mode: CameraMode.TABLE, icon: 'table' },
  { mode: CameraMode.WHEEL, icon: 'wheel' },
  { mode: CameraMode.DEALER, icon: 'dealer' },
];

export function CameraControls() {
  const t = useT();
  const cameraMode = useGameStore((s) => s.cameraMode);
  const autoCamera = useGameStore((s) => s.autoCamera);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const setAutoCamera = useGameStore((s) => s.setAutoCamera);

  return (
    <div className="segmented" role="group" aria-label={t('camera.title')}>
      {MODES.map(({ mode, icon }) => (
        <HudButton
          key={mode}
          variant="segment"
          active={cameraMode === mode}
          onClick={() => setCameraMode(mode)}
          title={t(`camera.${mode}`)}
        >
          <Icon name={icon} />
          <span>{t(`camera.${mode}`)}</span>
        </HudButton>
      ))}
      <span className="segmented__divider" aria-hidden="true" />
      <HudButton
        variant="segment"
        sound="toggle"
        active={autoCamera}
        onClick={() => setAutoCamera(!autoCamera)}
        title={t('camera.autoHint')}
      >
        <Icon name="auto" />
        <span>{t('camera.auto')}</span>
      </HudButton>
    </div>
  );
}
