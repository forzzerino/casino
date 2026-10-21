import type { ChipPalette } from '../../config/chipPalettes';
import { formatChipLabel } from '../../utils/format';

const INSERTS = 6;

/** SVG rendition of a casino chip, matching the 3D chip textures. */
export function ChipDisc({ value, palette, size = 52 }: { value: number; palette: ChipPalette; size?: number }) {
  const label = formatChipLabel(value);
  const r = 50;
  const insertArc = (k: number) => {
    const a0 = (k / INSERTS) * Math.PI * 2 - 0.17;
    const a1 = a0 + 0.34;
    const ro = r - 8;
    return `M ${50 + Math.cos(a0) * ro} ${50 + Math.sin(a0) * ro} A ${ro} ${ro} 0 0 1 ${50 + Math.cos(a1) * ro} ${50 + Math.sin(a1) * ro}`;
  };
  return (
    <svg className="chip-disc" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill={palette.base} />
      {Array.from({ length: INSERTS }, (_, k) => (
        <path key={k} d={insertArc(k)} stroke={palette.accent} strokeWidth="10" fill="none" />
      ))}
      <circle cx="50" cy="50" r="34" fill="none" stroke={palette.accent} strokeWidth="1.4" strokeDasharray="4 3" />
      <circle cx="50" cy="50" r="28" fill={palette.inlay} />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={palette.text}
        fontFamily="Manrope, sans-serif"
        fontWeight="800"
        fontSize={label.length <= 2 ? 26 : label.length === 3 ? 22 : 18}
      >
        {label}
      </text>
    </svg>
  );
}
