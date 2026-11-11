/**
 * Tanat — money conversion tests.
 *
 * These tests protect the most important rule in the codebase:
 * money is never stored as a floating point number.
 */

import { describe, expect, it } from 'vitest';
import {
  YOCTO_PER_NEAR,
  addYocto,
  formatTokenAmount,
  formatYoctoToNear,
  parseNearToYocto,
  parseTokenAmount,
  toYoctoString,
} from './money';

describe('parseNearToYocto', () => {
  it('converts whole NEAR amounts', () => {
    expect(parseNearToYocto('1')).toBe(YOCTO_PER_NEAR);
    expect(parseNearToYocto('5')).toBe(5n * YOCTO_PER_NEAR);
    expect(parseNearToYocto(0)).toBe(0n);
  });

  it('converts fractional NEAR amounts exactly', () => {
    expect(parseNearToYocto('0.5')).toBe(YOCTO_PER_NEAR / 2n);
    expect(parseNearToYocto('1.25')).toBe(1_250_000_000_000_000_000_000_000n);
    expect(parseNearToYocto('0.000000000000000000000001')).toBe(1n);
  });

  it('accepts all 24 decimal places', () => {
    expect(parseNearToYocto('0.123456789012345678901234')).toBe(
      123456789012345678901234n,
    );
  });

  it('rejects more than 24 decimal places', () => {
    expect(() => parseNearToYocto('0.1234567890123456789012345')).toThrow(
      'Invalid NEAR amount',
    );
  });

  it('rejects negative, exponent, and malformed values', () => {
    for (const value of ['-1', '1e5', '1.', '.5', '01', '1,5', '', 'abc']) {
      expect(() => parseNearToYocto(value)).toThrow('Invalid NEAR amount');
    }
  });

  it('rejects floating point numbers with more than 24 decimals', () => {
    expect(() => parseNearToYocto(1e-25)).toThrow('Invalid NEAR amount');
  });
});

describe('formatYoctoToNear', () => {
  it('formats whole amounts without a decimal point', () => {
    expect(formatYoctoToNear(0n)).toBe('0');
    expect(formatYoctoToNear(YOCTO_PER_NEAR)).toBe('1');
    expect(formatYoctoToNear(5n * YOCTO_PER_NEAR)).toBe('5');
  });

  it('formats fractional amounts without trailing zeros', () => {
    expect(formatYoctoToNear(YOCTO_PER_NEAR / 2n)).toBe('0.5');
    expect(formatYoctoToNear(1_250_000_000_000_000_000_000_000n)).toBe('1.25');
    expect(formatYoctoToNear(1n)).toBe('0.000000000000000000000001');
  });

  it('accepts an integer string', () => {
    expect(formatYoctoToNear('1000000000000000000000000')).toBe('1');
  });

  it('rejects negative values', () => {
    expect(() => formatYoctoToNear(-1n)).toThrow('cannot be negative');
  });
});

describe('round trips', () => {
  it('preserves value through parse and format', () => {
    for (const value of ['0', '0.1', '1', '12.345678', '999999.000000000000000001']) {
      expect(formatYoctoToNear(parseNearToYocto(value))).toBe(value);
    }
  });

  it('toYoctoString returns the database representation', () => {
    expect(toYoctoString('1')).toBe('1000000000000000000000000');
    expect(toYoctoString('0.5')).toBe('500000000000000000000000');
    expect(toYoctoString(0)).toBe('0');
  });

  it('adds amounts with BigInt precision', () => {
    const left = parseNearToYocto('0.1');
    const right = parseNearToYocto('0.2');
    expect(formatYoctoToNear(addYocto(left, right))).toBe('0.3');
  });
});

describe('token amounts (cross-chain payments)', () => {
  it('converts USDC amounts with 6 decimals', () => {
    expect(parseTokenAmount('1', 6)).toBe(1_000_000n);
    expect(parseTokenAmount('1.25', 6)).toBe(1_250_000n);
    expect(parseTokenAmount('0.000001', 6)).toBe(1n);
  });

  it('rejects too many decimals for the token', () => {
    expect(() => parseTokenAmount('0.0000001', 6)).toThrow('Invalid token amount');
  });

  it('formats token amounts without trailing zeros', () => {
    expect(formatTokenAmount(1_000_000n, 6)).toBe('1');
    expect(formatTokenAmount(1_250_000n, 6)).toBe('1.25');
    expect(formatTokenAmount(1n, 6)).toBe('0.000001');
    expect(formatTokenAmount(100n, 0)).toBe('100');
  });

  it('round trips token amounts', () => {
    for (const value of ['0', '1', '12.345678', '999999.000001']) {
      expect(formatTokenAmount(parseTokenAmount(value, 6), 6)).toBe(value);
    }
  });
});
