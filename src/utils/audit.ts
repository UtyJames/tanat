/**
 * Tanat — audit logging utility.
 *
 * Records audit events to the D1 audit_log table for compliance and debugging.
 * Failed authentication and authorization decisions are recorded too, with the
 * client IP address, so the trail matches what the threat model promises.
 */

import type { Context } from 'hono';
import type { HonoEnv } from '../types';

interface AuditEntry {
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  actorId?: string;
  ipAddress?: string;
}

/** Best-effort client IP from Cloudflare or a proxy chain. */
export function requestIp(c: Context<HonoEnv>): string | undefined {
  const cloudflareIp = c.req.header('cf-connecting-ip');
  if (cloudflareIp) return cloudflareIp.trim();

  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim();

  return undefined;
}

/**
 * Log an audit event to the database.
 * Fire-and-forget; errors are caught and logged but never thrown.
 */
export async function logAudit(db: D1Database, entry: AuditEntry): Promise<void> {
  try {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO audit_log (id, tenant_id, actor, action, resource_type, resource_id, details, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind(
        id,
        entry.tenantId,
        entry.actorId ?? 'system',
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.details ? JSON.stringify(entry.details) : '{}',
        entry.ipAddress ?? null,
      )
      .run();
  } catch (err) {
    // Audit logging should never break the request.
    console.error('Failed to write audit log:', err);
  }
}
