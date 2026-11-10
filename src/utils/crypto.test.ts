/**
 * Tanat — crypto utility tests.
 *
 * These tests check API key shape, randomness, and the exact hashing
 * scheme that the seed data and auth middleware depend on.
 */

import { describe, expect, it } from 'vitest';
import { generateApiKey, generateId, hashApiKey } from './crypto';

describe('generateId', () => {
  it('returns 32 hex characters with no prefix', () => {
    expect(generateId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('prefixes the id when asked', () => {
    expect(generateId('act')).toMatch(/^act_[0-9a-f]{32}$/);
  });

  it('produces different ids on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('x')));
    expect(ids.size).toBe(100);
  });
});

describe('generateApiKey', () => {
  it('returns a tnt_ key with 64 hex characters', () => {
    const { key } = generateApiKey();
    expect(key).toMatch(/^tnt_[0-9a-f]{64}$/);
  });

  it('returns a 12 character prefix', () => {
    const { key, prefix } = generateApiKey();
    expect(prefix).toBe(key.slice(0, 12));
    expect(prefix).toMatch(/^tnt_[0-9a-f]{8}$/);
  });

  it('produces unique keys', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey().key));
    expect(keys.size).toBe(100);
  });
});

describe('hashApiKey', () => {
  it('is deterministic for the same salt and key', async () => {
    const first = await hashApiKey('tnt_test', 'salt');
    const second = await hashApiKey('tnt_test', 'salt');
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the salt changes', async () => {
    const a = await hashApiKey('tnt_test', 'salt-a');
    const b = await hashApiKey('tnt_test', 'salt-b');
    expect(a).not.toBe(b);
  });

  it('matches the documented SHA-256("<salt>:<key>") scheme', async () => {
    const actual = await hashApiKey('demo-key', 'demo-salt');

    // Recompute the digest with Web Crypto directly, without the helper.
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode('demo-salt:demo-key'),
    );
    const recomputed = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    expect(actual).toBe(recomputed);
    expect(actual).toHaveLength(64);
  });
});
