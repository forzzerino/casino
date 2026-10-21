import type { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'menu'
  | 'settings'
  | 'sound'
  | 'mute'
  | 'info'
  | 'help'
  | 'chart'
  | 'bolt'
  | 'autoplay'
  | 'close'
  | 'minus'
  | 'plus'
  | 'spin'
  | 'stop'
  | 'lobby'
  | 'play'
  | 'check';

const PATHS: Record<IconName, ReactElement> = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1A7.5 7.5 0 0 0 9.6 19l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4z" />
    </>
  ),
  sound: <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />,
  mute: <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM16 9.5l5 5M21 9.5l-5 5" />,
  info: <path d="M12 8h.01M11 11.5h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
  help: <path d="M9.3 9a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.5M12 17h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  bolt: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />,
  autoplay: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5M10 9.2v5.6l4.6-2.8z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  minus: <path d="M6 12h12" />,
  plus: <path d="M12 6v12M6 12h12" />,
  spin: <path d="M19.5 9.5A8 8 0 0 0 5.2 7.5M4.5 14.5a8 8 0 0 0 14.3 2M5 3.5v4.5h4.5M19 20.5V16h-4.5" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  lobby: <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
