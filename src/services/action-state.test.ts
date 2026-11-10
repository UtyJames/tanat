/**
 * Tanat — action state machine tests.
 *
 * The approval gate is a security boundary. These tests pin down which
 * transitions are allowed so a refactor cannot quietly let an action
 * skip human approval.
 */

import { describe, expect, it } from 'vitest';
import {
  canApprove,
  canExecute,
  canReject,
  isExpired,
  parseTimestamp,
} from './action-state';

describe('approval transitions', () => {
  it('only allows approving a pending action', () => {
    expect(canApprove('pending')).toBe(true);
    for (const status of ['approved', 'rejected', 'executed', 'failed', 'expired']) {
      expect(canApprove(status)).toBe(false);
    }
  });

  it('only allows rejecting a pending action', () => {
    expect(canReject('pending')).toBe(true);
    for (const status of ['approved', 'rejected', 'executed', 'failed', 'expired']) {
      expect(canReject(status)).toBe(false);
    }
  });

  it('only allows executing an approved action', () => {
    expect(canExecute('approved')).toBe(true);
    for (const status of ['pending', 'rejected', 'executed', 'failed', 'expired']) {
      expect(canExecute(status)).toBe(false);
    }
  });
});

describe('parseTimestamp', () => {
  it('parses SQLite timestamps as UTC', () => {
    expect(parseTimestamp('2026-01-01 00:00:00')).toBe(
      Date.parse('2026-01-01T00:00:00Z'),
    );
  });

  it('parses ISO timestamps unchanged', () => {
    expect(parseTimestamp('2026-01-01T12:30:00.000Z')).toBe(
      Date.parse('2026-01-01T12:30:00.000Z'),
    );
  });

  it('returns NaN for unreadable values', () => {
    expect(Number.isNaN(parseTimestamp('not-a-date'))).toBe(true);
  });
});

describe('isExpired', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  it('is false for a future expiry', () => {
    expect(isExpired('2026-01-01T13:00:00Z', now)).toBe(false);
  });

  it('is true for a past expiry', () => {
    expect(isExpired('2026-01-01T11:00:00Z', now)).toBe(true);
  });

  it('is true exactly at the expiry time', () => {
    expect(isExpired('2026-01-01T12:00:00Z', now)).toBe(true);
  });

  it('fails closed when the timestamp is unreadable', () => {
    expect(isExpired('garbage', now)).toBe(true);
    expect(isExpired('', now)).toBe(true);
  });
});
