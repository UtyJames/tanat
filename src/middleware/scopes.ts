/**
 * Tanat — scope enforcement middleware.
 *
 * API keys carry explicit scopes. Routes declare which scope they need so a
 * read-only key cannot create agents, move money, or mint new keys.
 *
 * The security review (H-06) split the old umbrella `actions` scope into
 * `actions:read`, `actions:propose`, `actions:approve`, and `actions:execute`.
 * The legacy `actions` scope is still accepted as an alias for older keys, but
 * separation of duties is enforced independently of scopes in the action
 * service (a proposer can never approve its own action).
 */

import type { Context, MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';
import { ForbiddenError } from '../utils/errors';
import { logAudit, requestIp } from '../utils/audit';

const LEGACY_ACTION_SCOPE = 'actions';

function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes('*') || scopes.includes(required)) return true;

  // Backwards compatibility for keys issued before the split.
  if (required.startsWith('actions:') && scopes.includes(LEGACY_ACTION_SCOPE)) {
    return true;
  }

  return false;
}

async function assertScope(c: Context<HonoEnv>, required: string[]): Promise<void> {
  const scopes = c.get('scopes') ?? [];
  if (required.some((scope) => hasScope(scopes, scope))) return;

  await logAudit(c.env.DB, {
    tenantId: c.get('tenantId') ?? 'unknown',
    action: 'authz.denied',
    resourceType: 'api_key',
    resourceId: c.get('apiKeyId') ?? 'unknown',
    actorId: c.get('apiKeyId'),
    details: { required_scopes: required, path: c.req.path },
    ipAddress: requestIp(c),
  });

  throw new ForbiddenError(
    `API key missing required scope: ${required.join(' or ')}`,
  );
}

/**
 * True when the key holds one of the required scopes. Used by handlers that
 * need to gate a specific branch (for example a money proposal inside the
 * chat route) rather than the whole route.
 */
export function keyHasAnyScope(
  scopes: string[],
  required: string[],
): boolean {
  return required.some((scope) => hasScope(scopes, scope));
}

/** Require one scope (or the legacy alias) for every method. */
export function requireScope(...required: string[]): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    await assertScope(c, required);
    await next();
  };
}

/** Require any one of the listed scopes. */
export function requireAnyScope(required: string[]): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    await assertScope(c, required);
    await next();
  };
}

/**
 * Require a read scope for safe methods and a write scope for everything else.
 * This keeps list/detail endpoints usable with a read-only key.
 */
export function requireScopeForMethod(
  readScope: string,
  writeScope: string,
): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const method = c.req.method.toUpperCase();
    const safe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
    await assertScope(c, [safe ? readScope : writeScope]);
    await next();
  };
}
