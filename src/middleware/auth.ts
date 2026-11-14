/**
 * Tanat — authentication middleware.
 *
 * Validates API keys from the Authorization header and resolves the tenant.
 * Only the Bearer scheme is accepted.
 */

import { MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';
import { hashApiKey } from '../utils/crypto';
import { AppError, ForbiddenError, UnauthorizedError } from '../utils/errors';
import { logAudit, requestIp } from '../utils/audit';
import { resolveMemberScopes } from './rbac';

/** Client request ids are useful for tracing but are untrusted input. */
function sanitizeRequestId(value: string | undefined): string {
  if (!value) return crypto.randomUUID();

  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 64 ||
    !/^[A-Za-z0-9._:-]+$/.test(trimmed)
  ) {
    return crypto.randomUUID();
  }

  return trimmed;
}

function parseScopes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * Create an auth middleware that optionally enforces a scope.
 * API keys are passed via `Authorization: Bearer tnt_...`
 */
export function authMiddleware(scope?: string): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    c.set('requestId', sanitizeRequestId(c.req.header('X-Request-ID')));

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      await logAudit(c.env.DB, {
        tenantId: 'unknown',
        action: 'auth.failed',
        resourceType: 'api_key',
        resourceId: 'unknown',
        details: { reason: 'missing_bearer_header' },
        ipAddress: requestIp(c),
      });
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      await logAudit(c.env.DB, {
        tenantId: 'unknown',
        action: 'auth.failed',
        resourceType: 'api_key',
        resourceId: 'unknown',
        details: { reason: 'empty_key' },
        ipAddress: requestIp(c),
      });
      throw new UnauthorizedError('API key is required');
    }

    const salt = c.env.API_KEY_SALT ?? '';
    if (!salt) {
      throw new AppError('API_KEY_SALT is not configured', 500, 'CONFIG_ERROR');
    }

    const keyHash = await hashApiKey(apiKey, salt);

    const row = await c.env.DB.prepare(
      `SELECT ak.id, ak.tenant_id, ak.scopes, ak.is_active, t.status as tenant_status
       FROM api_keys ak
       JOIN tenants t ON t.id = ak.tenant_id
       WHERE ak.key_hash = ? AND ak.is_active = 1
         AND (ak.expires_at IS NULL OR datetime(ak.expires_at) > datetime('now'))`,
    )
      .bind(keyHash)
      .first<{
        id: string;
        tenant_id: string;
        scopes: string | null;
        is_active: number;
        tenant_status: string;
      }>();

    let tenantId = row?.tenant_id;
    let apiKeyId = row?.id;
    let scopes = parseScopes(row?.scopes ?? null);
    let actorType: 'api_key' | 'dashboard_user' = 'api_key';
    let workspaceRole: string | undefined;

    if (!row && apiKey.startsWith('tns_')) {
      const session = await c.env.DB.prepare(
        `SELECT s.id, u.id AS user_id, u.email AS user_email, u.tenant_id
         FROM dashboard_sessions s
         JOIN dashboard_users u ON u.id = s.user_id
         JOIN tenants t ON t.id = u.tenant_id
         WHERE s.token_hash = ? AND s.revoked_at IS NULL
           AND s.expires_at > datetime('now') AND t.status = 'active'`,
      )
        .bind(keyHash)
        .first<{ id: string; user_id: string; user_email: string; tenant_id: string }>();

      if (session) {
        const member = await c.env.DB.prepare(
          `SELECT role, workspace_role, permissions, status
           FROM workspace_members
           WHERE tenant_id = ? AND (user_id = ? OR lower(email) = lower(?))
           LIMIT 1`,
        )
          .bind(session.tenant_id, session.user_id, session.user_email)
          .first<{
            role: string;
            workspace_role?: string | null;
            permissions?: string | null;
            status: string;
          }>();

        if (member && member.status === 'suspended') {
          throw new ForbiddenError('Your workspace membership is suspended');
        }

        tenantId = session.tenant_id;
        apiKeyId = session.user_id;
        actorType = 'dashboard_user';
        workspaceRole = member?.workspace_role ?? member?.role ?? 'owner';
        scopes = resolveMemberScopes(workspaceRole, member?.permissions);
        try {
          c.executionCtx.waitUntil(
            c.env.DB.prepare(
              "UPDATE dashboard_sessions SET last_used_at = datetime('now') WHERE id = ?",
            )
              .bind(session.id)
              .run()
              .catch(() => undefined),
          );
        } catch {
          // No execution context. Skip the last-used update.
        }
      }
    }

    if (!tenantId || !apiKeyId) {
      await logAudit(c.env.DB, {
        tenantId: 'unknown',
        action: 'auth.failed',
        resourceType: 'api_key',
        resourceId: 'unknown',
        details: { reason: 'invalid_or_expired_key' },
        ipAddress: requestIp(c),
      });
      throw new UnauthorizedError('Invalid or expired API key');
    }

    if (row && row.tenant_status !== 'active') {
      await logAudit(c.env.DB, {
        tenantId,
        action: 'auth.failed',
        resourceType: 'api_key',
        resourceId: row.id,
        details: { reason: 'tenant_not_active' },
        ipAddress: requestIp(c),
      });
      throw new ForbiddenError('Tenant is not active');
    }

    if (scope && !scopes.includes(scope) && !scopes.includes('*')) {
      await logAudit(c.env.DB, {
        tenantId,
        action: 'authz.denied',
        resourceType: 'api_key',
        resourceId: apiKeyId,
        actorId: apiKeyId,
        details: { required_scope: scope, path: c.req.path },
        ipAddress: requestIp(c),
      });
      throw new ForbiddenError(`API key missing required scope: ${scope}`);
    }

    c.set('tenantId', tenantId);
    c.set('apiKeyId', apiKeyId);
    c.set('scopes', scopes);
    c.set('actorType', actorType);
    if (workspaceRole) c.set('workspaceRole', workspaceRole);

    if (row) {
      try {
        c.executionCtx.waitUntil(
          c.env.DB.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?")
            .bind(apiKeyId)
            .run()
            .catch(() => undefined),
        );
      } catch {
        // No execution context. Skip the last-used update.
      }
    }

    await next();
  };
}
