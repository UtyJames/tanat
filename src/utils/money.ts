/**
 * Tanat — money helpers.
 *
 * Rule: the database stores NEAR amounts in yoctoNEAR (the smallest unit)
 * as integer strings. The API accepts and returns NEAR decimal strings.
 * All arithmetic uses BigInt so no precision is lost.
 */

export const YOCTO_PER_NEAR = 10n ** 24n;

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,24})?$/;

/**
 * Convert a NEAR decimal string or number to yoctoNEAR.
 * Rejects negative values, exponents, and more than 24 decimal places.
 */
export function parseNearToYocto(value: string | number): bigint {
  const text = (typeof value === 'number' ? String(value) : value).trim();

  if (!DECIMAL_PATTERN.test(text)) {
    throw new Error(`Invalid NEAR amount: ${String(value)}`);
  }

  const [whole, fraction = ''] = text.split('.');
  const paddedFraction = (fraction + '0'.repeat(24)).slice(0, 24);

  return BigInt(whole) * YOCTO_PER_NEAR + BigInt(paddedFraction);
}

/**
 * Convert yoctoNEAR to a NEAR decimal string without trailing zeros.
 */
export function formatYoctoToNear(value: bigint | string): string {
  const yocto = typeof value === 'bigint' ? value : BigInt(value);

  if (yocto < 0n) {
    throw new Error('NEAR amount cannot be negative');
  }

  const whole = yocto / YOCTO_PER_NEAR;
  const fraction = (yocto % YOCTO_PER_NEAR)
    .toString()
    .padStart(24, '0')
    .replace(/0+$/, '');

  return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}

/**
 * Convert a NEAR decimal value to the integer string stored in the database.
 */
export function toYoctoString(value: string | number): string {
  return parseNearToYocto(value).toString();
}

/**
 * Convert a decimal token amount to its smallest unit for an arbitrary
 * token (USDC has 6 decimals, ETH has 18, and so on).
 */
export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`Invalid token decimals: ${decimals}`);
  }

  const text = String(value).trim();
  const pattern =
    decimals === 0
      ? /^(?:0|[1-9]\d*)$/
      : new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${decimals}})?$`);

  if (!pattern.test(text)) {
    throw new Error(`Invalid token amount: ${String(value)}`);
  }

  const [whole, fraction = ''] = text.split('.');
  const paddedFraction = (fraction + '0'.repeat(decimals)).slice(0, decimals);

  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || '0');
}

/**
 * Convert a smallest-unit token amount to a decimal string without trailing
 * zeros.
 */
export function formatTokenAmount(value: bigint | string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`Invalid token decimals: ${decimals}`);
  }

  const raw = typeof value === 'bigint' ? value : BigInt(value);
  if (raw < 0n) throw new Error('Token amount cannot be negative');

  if (decimals === 0) return raw.toString();

  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = (raw % divisor)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');

  return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}

/**
 * Add two yoctoNEAR amounts.
 */
export function addYocto(left: bigint, right: bigint): bigint {
  return left + right;
}
