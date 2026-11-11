import type { CSSProperties } from 'react';

/**
 * Tanat brand mark — "The Infrastructure Nexus".
 *
 * A geometric symbol representing one central intelligence infrastructure
 * connecting multiple specialized business agents and channels across a
 * 40×40 grid, scalable from 16px favicons up to full display size.
 */
export function LogoMark({
  size = 32,
  className,
  style,
  tone = 'ink',
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  tone?: 'ink' | 'lime' | 'bone';
}) {
  const bg =
    tone === 'lime' ? '#C9F26B' : tone === 'bone' ? '#F6F3EA' : '#0C0D0B';
  const primary =
    tone === 'lime' ? '#0C0D0B' : tone === 'bone' ? '#0C0D0B' : '#C9F26B';
  const secondary =
    tone === 'lime' ? '#161814' : tone === 'bone' ? '#383B33' : '#F6F3EA';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="36" height="36" rx="10" fill={bg} />
      {/* Top horizontal infrastructure bar & vertical spine forming a connected T-nexus */}
      <path
        d="M11 12.5H29M20 12.5V29.5M11 22.5L20 19.5L29 22.5"
        stroke={primary}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central core intelligence node */}
      <rect
        x="16.2"
        y="15.7"
        width="7.6"
        height="7.6"
        rx="2.2"
        fill={primary}
      />
      {/* Surrounding connected agent/channel nodes */}
      <circle cx="11" cy="12.5" r="2.7" fill={secondary} />
      <circle cx="29" cy="12.5" r="2.7" fill={secondary} />
      <circle cx="11" cy="22.5" r="2.3" fill={primary} />
      <circle cx="29" cy="22.5" r="2.3" fill={primary} />
      <circle cx="20" cy="29.5" r="2.7" fill={secondary} />
    </svg>
  );
}

export function Logo({
  size = 30,
  tone = 'ink',
  className = '',
  wordmark = true,
}: {
  size?: number;
  tone?: 'ink' | 'lime' | 'bone';
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={`brand ${className}`}>
      <LogoMark size={size} tone={tone} />
      {wordmark && (
        <span className={`brand-word ${tone === 'bone' ? 'brand-word-bone' : ''}`}>
          Tanat<span className="brand-dot">.</span>
        </span>
      )}
    </span>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.8 8.4l3.2 3.2 7.2-7.2"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
