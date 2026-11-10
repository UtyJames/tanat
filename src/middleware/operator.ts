/**
 * Tanat — operator authentication.
 *
 * Platform-level operations (creating a tenant) must not be callable with a
 * tenant API key. They require the separate operator key, compared in
 * constant time against a SHA-256 digest so neither the value nor its length
 * leaks through timing.
 */

import type { MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';
import { AppError, UnauthorizedError } from '../utils/errors';
import { DEV_MASTER_KEY } from '../config';

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return new Uint8Array(digest);
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

export const operatorAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const expected = c.env.MASTER_API_KEY ?? '';

  if (!expected || expected === DEV_MASTER_KEY) {
    throw new AppError(
      'Operator credentials are not configured',
      500,
      'CONFIG_ERROR',
    );
  }

  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing operator credentials');
  }

  const presented = header.slice(7).trim();
  if (!presented || !(await constantTimeEqual(presented, expected))) {
    throw new UnauthorizedError('Invalid operator credentials');
  }

  await next();
};
