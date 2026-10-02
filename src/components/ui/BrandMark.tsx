/** Minimal brass wheel emblem used in the top bar, intro and pause screen. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
      {Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return (
          <line
            key={k}
            x1={20 + Math.cos(a) * 11.5}
            y1={20 + Math.sin(a) * 11.5}
            x2={20 + Math.cos(a) * 18}
            y2={20 + Math.sin(a) * 18}
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.6"
          />
        );
      })}
      <circle cx="20" cy="5.5" r="2" fill="#f1ece1" />
    </svg>
  );
}
