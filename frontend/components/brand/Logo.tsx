import type { CSSProperties } from 'react';

/**
 * Tanat brand mark — "the tally".
 *
 * A speech bubble whose check mark is the payment confirmation: the two things
 * Tanat does in one shape. Drawn on a 40×40 grid so it stays legible at 16px.
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
  const fill =
    tone === 'lime' ? '#C9F26B' : tone === 'bone' ? '#F6F3EA' : '#0C0D0B';
  const cut =
    tone === 'lime' ? '#0C0D0B' : tone === 'bone' ? '#0C0D0B' : '#C9F26B';

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
      <path
        d="M12.4 3.5h15.2c5.4 0 9.9 4.4 9.9 9.9v11.4c0 5.5-4.5 9.9-9.9 9.9h-9.9l-9.3 5.4 2.1-8.1a9.9 9.9 0 0 1-3.4-7.7V13.4c0-5.5 4.4-9.9 9.9-9.9Z"
        fill={fill}
      />
      <path
        d="M12.2 19.6l4.9 4.9L28.3 13"
        stroke={cut}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
          tanat<span className="brand-dot">.</span>
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
