import './logo.css';

import { useId } from 'react';

/** The COSMIC SPIN wordmark: chunky gold letters inside an orbit ring, built in SVG/CSS so it stays sharp. */
export function Logo({ size = 'medium', animated = false }: { size?: 'small' | 'medium' | 'large'; animated?: boolean }) {
  const gradientId = useId();
  return (
    <div className={`cs-logo cs-logo--${size}${animated ? ' is-animated' : ''}`} role="img" aria-label="Cosmic Spin">
      <svg className="cs-logo__orbit" viewBox="0 0 400 160" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1">
            <stop offset="0" stopColor="#a96713" stopOpacity="0" />
            <stop offset="0.25" stopColor="#ffc247" />
            <stop offset="0.6" stopColor="#ffe6a0" />
            <stop offset="1" stopColor="#a96713" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="86" rx="188" ry="46" fill="none" stroke={`url(#${gradientId})`} strokeWidth="5" transform="rotate(-8 200 86)" />
        <circle className="cs-logo__planet" cx="356" cy="52" r="9" fill="#ffd36e" />
      </svg>
      <span className="cs-logo__word cs-logo__word--top" aria-hidden="true">
        COSMIC
      </span>
      <span className="cs-logo__word cs-logo__word--bottom" aria-hidden="true">
        SPIN
      </span>
      {animated && <span className="cs-logo__sweep" aria-hidden="true" />}
    </div>
  );
}
