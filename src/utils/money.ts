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
 * Add two yoctoNEAR amounts.
 */
export function addYocto(left: bigint, right: bigint): bigint {
  return left + right;
}
