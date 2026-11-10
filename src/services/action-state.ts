/**
 * Tanat — action state rules.
 *
 * These rules are pure functions so they can be tested without a database.
 */

export type ActionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'expired';

export function canApprove(status: string): boolean {
  return status === 'pending';
}

export function canReject(status: string): boolean {
  return status === 'pending';
}

export function canExecute(status: string): boolean {
  return status === 'approved';
}

/**
 * Parse a database timestamp as UTC.
 * SQLite stores "YYYY-MM-DD HH:MM:SS" without a timezone, so we add one.
 */
export function parseTimestamp(value: string): number {
  const text = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return Date.parse(text);
}

/**
 * An action is expired when its expiry time is in the past.
 * An unreadable timestamp is treated as expired (fail closed).
 */
export function isExpired(expiresAt: string, now: Date = new Date()): boolean {
  const timestamp = parseTimestamp(expiresAt);
  if (Number.isNaN(timestamp)) return true;
  return timestamp <= now.getTime();
}
