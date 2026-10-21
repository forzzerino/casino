import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { gameEvents } from '../../game/events';

interface HudButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'default' | 'primary' | 'ghost' | 'segment';
  readonly active?: boolean;
  readonly sound?: 'soft' | 'toggle' | 'none';
}

/**
 * Every HUD button: consistent styling, a subtle click sound, and it drops
 * focus after a mouse click so the Space-to-bet shortcut keeps working.
 */
export function HudButton({
  variant = 'default',
  active = false,
  sound = 'soft',
  className = '',
  onClick,
  ...rest
}: HudButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (sound !== 'none') gameEvents.emit('uiClick', { variant: sound });
    onClick?.(event);
    if (event.detail > 0) event.currentTarget.blur();
  };
  return (
    <button
      type="button"
      className={`btn btn--${variant}${active ? ' is-active' : ''} ${className}`.trim()}
      aria-pressed={variant === 'segment' ? active : undefined}
      onClick={handleClick}
      {...rest}
    />
  );
}
