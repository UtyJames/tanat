/**
 * Tanat — usage metering service.
 *
 * Tracks API usage and resource consumption per tenant.
 */

import { generateId } from '../utils/crypto';

export interface UsageRecord {
  id: string;
  tenant_id: string;
  type: string;
  quantity: number;
  metadata: string | null;
  recorded_at: string;
}

export interface UsageSummary {
  tenant_id: string;
  total_api_calls: number;
  total_tokens: number;
  total_actions: number;
  total_near_transactions: number;
  period_start: string;
  period_end: string;
}

/**
 * Record a usage event.
 */
export async function recordUsage(
  db: D1Database,
  tenantId: string,
  type: string,
  quantity = 1,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const id = generateId('usg');
    await db
      .prepare(
        `INSERT INTO usage_records (id, tenant_id, type, quantity, metadata, recorded_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind(
        id,
        tenantId,
        type,
        quantity,
        metadata ? JSON.stringify(metadata) : null,
      )
      .run();
  } catch (err) {
    // Metering must never break the request.
    console.error('Failed to record usage:', err);
  }
}

/**
 * Get a usage summary for a tenant over a given time period.
 */
export async function getUsageSummary(
  db: D1Database,
  tenantId: string,
  fromDate?: string,
  toDate?: string,
): Promise<UsageSummary> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const periodStart = fromDate ?? thirtyDaysAgo.toISOString();
  const periodEnd = toDate ?? now.toISOString();

  async function sum(type: string): Promise<number> {
    const row = await db
      .prepare(
        `SELECT COALESCE(SUM(quantity), 0) as total FROM usage_records
         WHERE tenant_id = ? AND type = ? AND recorded_at >= ? AND recorded_at <= ?`,
      )
      .bind(tenantId, type, periodStart, periodEnd)
      .first<{ total: number }>();

    return row?.total ?? 0;
  }

  return {
    tenant_id: tenantId,
    total_api_calls: await sum('api_call'),
    total_tokens: await sum('tokens'),
    total_actions: await sum('action'),
    total_near_transactions: await sum('near_transaction'),
    period_start: periodStart,
    period_end: periodEnd,
  };
}
