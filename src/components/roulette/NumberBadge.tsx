import { numberColor } from '../../game/roulette/numbers';

interface NumberBadgeProps {
  readonly n: number;
  readonly size?: 'xs' | 'sm' | 'md' | 'lg';
  readonly emphasis?: boolean;
  readonly dimmed?: boolean;
}

/** A roulette number in its pocket colour. */
export function NumberBadge({ n, size = 'sm', emphasis = false, dimmed = false }: NumberBadgeProps) {
  return (
    <span
      className={`number-badge number-badge--${size} number-badge--${numberColor(n)}${emphasis ? ' is-emphasis' : ''}${dimmed ? ' is-dimmed' : ''}`}
    >
      {n}
    </span>
  );
}
