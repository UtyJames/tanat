/**
 * Tanat - Cryptographic utilities
 *
 * ID generation, API key generation, and hashing functions
 * designed for the Cloudflare Workers runtime (uses Web Crypto API).
 */

/**
 * Generate a random ID with an optional prefix.
 * Format: prefix_<random hex string>
 */
export function generateId(prefix = ''): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix ? `${prefix}_${hex}` : hex;
}

/**
 * Generate a new API key.
 * Format: tnt_<64 hex chars>
 * The key prefix (first 8 chars after tnt_) is stored for identification.
 */
export function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = `tnt_${hex}`;
  const prefix = key.substring(0, 12); // "tnt_" + 8 hex chars
  return { key, prefix };
}

/**
 * Hash an API key using SHA-256 with an optional salt.
 * Returns a hex-encoded hash.
 */
export async function hashApiKey(key: string, salt = ''): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${key}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
