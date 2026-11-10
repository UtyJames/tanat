/**
 * Tanat — configuration validation.
 *
 * The Phase 0 security review (H-05) found that the shipped configuration ran
 * with `ENVIRONMENT=development`, which disabled the production salt guard and
 * accepted a publicly known operator key. Configuration is now validated on
 * every request and fails closed:
 *
 *   - the environment name must be explicit;
 *   - API_KEY_SALT is required everywhere except local development and tests;
 *   - the development salt and master key are rejected unconditionally;
 *   - production requires an explicit CORS allowlist (never `*`).
 */

import type { Env } from './types';
import { AppError } from './utils/errors';

export const DEV_MASTER_KEY = 'dev-master-key-change-in-production';
export const DEV_SALT = 'dev-salt-change-in-production';

/** Environments where a local-only salt/key may be absent. */
const LOCAL_ENVIRONMENTS = new Set(['local', 'test', 'development']);

export function assertConfig(env: Env): void {
  const environment = (env.ENVIRONMENT ?? '').trim().toLowerCase();

  if (!environment) {
    throw new AppError(
      'ENVIRONMENT is not configured',
      500,
      'CONFIG_ERROR',
    );
  }

  if (!env.DB) {
    throw new AppError('D1 database binding is missing', 500, 'CONFIG_ERROR');
  }

  const salt = (env.API_KEY_SALT ?? '').trim();

  if (!salt && !LOCAL_ENVIRONMENTS.has(environment)) {
    throw new AppError(
      'API_KEY_SALT is required outside local development',
      500,
      'CONFIG_ERROR',
    );
  }

  // These values are published in the repository. They must never protect a
  // real deployment, regardless of how ENVIRONMENT is set.
  if (salt === DEV_SALT) {
    throw new AppError(
      'The development API_KEY_SALT is not allowed. Rotate the salt.',
      500,
      'CONFIG_ERROR',
    );
  }

  if ((env.MASTER_API_KEY ?? '').trim() === DEV_MASTER_KEY) {
    throw new AppError(
      'The development MASTER_API_KEY is not allowed. Rotate the operator key.',
      500,
      'CONFIG_ERROR',
    );
  }

  if (environment === 'production') {
    if (!(env.MASTER_API_KEY ?? '').trim()) {
      throw new AppError(
        'MASTER_API_KEY is required in production',
        500,
        'CONFIG_ERROR',
      );
    }

    const origins = (env.CORS_ORIGINS ?? '').trim();
    if (!origins || origins === '*' || origins.split(',').some((value) => value.trim() === '*')) {
      throw new AppError(
        'CORS_ORIGINS must be an explicit allowlist in production',
        500,
        'CONFIG_ERROR',
      );
    }
  }
}
