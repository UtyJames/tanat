/**
 * Tanat — Security Monitoring & Anomaly Alerting Service.
 *
 * Records security alerts for cross-tenant attempts, repeated auth/authz
 * failures, bulk data exports, and privileged access events.
 */

import { generateId } from '../utils/crypto';
import { redactSecrets } from './ai-privacy.service';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityAlertInput {
  tenantId: string;
  severity: AlertSeverity;
  category:
    | 'cross_tenant_attempt'
    | 'auth_anomaly'
    | 'authz_denied_spike'
    | 'bulk_export'
    | 'privileged_access'
    | 'rate_limit_abuse';
  title: string;
  details?: Record<string, unknown>;
  actorId?: string | null;
}

export async function recordSecurityAlert(
  db: D1Database,
  input: SecurityAlertInput,
): Promise<string | null> {
  try {
    const id = generateId('alrt');
    const safeDetails = redactSecrets(JSON.stringify(input.details ?? {}));
    await db
      .prepare(
        `INSERT INTO security_alerts
           (id, tenant_id, severity, category, title, details, actor_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))`,
      )
      .bind(
        id,
        input.tenantId || 'unknown',
        input.severity,
        input.category,
        input.title,
        safeDetails,
        input.actorId ?? null,
      )
      .run();
    return id;
  } catch {
    return null;
  }
}

export async function checkDeniedSpikeAndAlert(
  db: D1Database,
  tenantId: string,
  actorId: string,
  action: 'auth.failed' | 'authz.denied',
): Promise<void> {
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM audit_log
          WHERE tenant_id = ? AND action = ?
            AND created_at >= datetime('now', '-15 minutes')`,
      )
      .bind(tenantId, action)
      .first<{ cnt: number }>();

    if ((row?.cnt ?? 0) >= 5) {
      await recordSecurityAlert(db, {
        tenantId,
        severity: 'high',
        category: action === 'auth.failed' ? 'auth_anomaly' : 'authz_denied_spike',
        title: `Repeated ${action} events detected (${row?.cnt ?? 0} in 15m)`,
        details: { action, count_15m: row?.cnt ?? 0 },
        actorId,
      });
    }
  } catch {
    // Best effort alerting.
  }
}
