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
    tone === 'lime' ? '#00EC97' : tone === 'bone' ? '#F7F5F3' : '#132030';
  const cloud = tone === 'ink' ? '#00EC97' : '#132030';
  const eye = bg;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill={bg} />
      <path d="M23 23 C20 18, 17 16, 15 15" stroke={cloud} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="14.5" cy="14.5" r="3.4" fill={cloud} />
      <path d="M37 22 C39 17, 41 15, 43 13.5" stroke={cloud} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="43.5" cy="13.2" r="3.4" fill={cloud} />
      <path d="M44 26 C47 22, 49.5 21, 51.5 20.5" stroke={cloud} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="52" cy="20.2" r="3" fill={cloud} />
      <path
        d="M21 48H45C50.5 48 54.5 43.8 54.5 38.5C54.5 33.7 51 29.7 46.3 29.1C45.3 23.2 40.2 18.8 34 18.8C28.4 18.8 23.6 22.5 22.1 27.6C16.2 28.1 11.5 33 11.5 39C11.5 44.1 15.6 48 21 48Z"
        fill={cloud}
      />
      <circle cx="27.5" cy="36.5" r="5.2" fill={eye} />
      <circle cx="28.6" cy="35.6" r="2.2" fill={cloud} />
      <circle cx="40.5" cy="36.5" r="5.2" fill={eye} />
      <circle cx="41.6" cy="35.6" r="2.2" fill={cloud} />
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
