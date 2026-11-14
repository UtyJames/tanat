/**
 * Tanat — Central Tenant-Scoped Data Access Repository.
 *
 * Every tenant-owned database operation MUST pass through this repository
 * (or an equivalent query explicitly scoped by authenticated `tenantId`).
 * The `tenantId` is bound at construction time from server-side auth context
 * and can never be overridden by client parameters.
 */

import { ForbiddenError } from '../utils/errors';

export class TenantRepository {
  public readonly tenantId: string;

  constructor(
    private readonly db: D1Database,
    tenantId: string,
  ) {
    const trimmed = (tenantId ?? '').trim();
    if (!trimmed || trimmed === 'unknown') {
      throw new ForbiddenError('Tenant context not established');
    }
    this.tenantId = trimmed;
  }

  async getTenant(): Promise<Record<string, unknown> | null> {
    return this.db
      .prepare('SELECT * FROM tenants WHERE id = ? AND status != ?')
      .bind(this.tenantId, 'deleted')
      .first<Record<string, unknown>>();
  }

  async getAgent(agentId: string): Promise<Record<string, unknown> | null> {
    return this.db
      .prepare("SELECT * FROM agents WHERE id = ? AND tenant_id = ? AND status != 'archived'")
      .bind(agentId, this.tenantId)
      .first<Record<string, unknown>>();
  }

  async listAgents(): Promise<Record<string, unknown>[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM agents WHERE tenant_id = ? AND status != 'archived' ORDER BY created_at DESC")
      .bind(this.tenantId)
      .all<Record<string, unknown>>();
    return results ?? [];
  }

  async getInstallation(installationId: string): Promise<Record<string, unknown> | null> {
    return this.db
      .prepare("SELECT * FROM installations WHERE id = ? AND tenant_id = ? AND status != 'removed'")
      .bind(installationId, this.tenantId)
      .first<Record<string, unknown>>();
  }

  async getSession(sessionId: string): Promise<Record<string, unknown> | null> {
    return this.db
      .prepare('SELECT * FROM sessions WHERE id = ? AND tenant_id = ?')
      .bind(sessionId, this.tenantId)
      .first<Record<string, unknown>>();
  }

  async listSessionMessages(sessionId: string, limit = 100): Promise<Record<string, unknown>[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM messages
          WHERE session_id = ? AND tenant_id = ?
          ORDER BY created_at ASC
          LIMIT ?`,
      )
      .bind(sessionId, this.tenantId, limit)
      .all<Record<string, unknown>>();
    return results ?? [];
  }

  async getAction(actionId: string): Promise<Record<string, unknown> | null> {
    return this.db
      .prepare('SELECT * FROM actions WHERE id = ? AND tenant_id = ?')
      .bind(actionId, this.tenantId)
      .first<Record<string, unknown>>();
  }

  async getKnowledgeSource(sourceId: string): Promise<Record<string, unknown> | null> {
    return this.db
      .prepare('SELECT * FROM knowledge_sources WHERE id = ? AND tenant_id = ?')
      .bind(sourceId, this.tenantId)
      .first<Record<string, unknown>>();
  }

  async listKnowledgeSources(agentId?: string): Promise<Record<string, unknown>[]> {
    const query = agentId
      ? `SELECT k.*, a.name AS agent_name
           FROM knowledge_sources k
           LEFT JOIN agents a ON a.id = k.agent_id AND a.tenant_id = k.tenant_id
          WHERE k.tenant_id = ? AND (k.agent_id IS NULL OR k.agent_id = ?)
          ORDER BY k.created_at DESC`
      : `SELECT k.*, a.name AS agent_name
           FROM knowledge_sources k
           LEFT JOIN agents a ON a.id = k.agent_id AND a.tenant_id = k.tenant_id
          WHERE k.tenant_id = ?
          ORDER BY k.created_at DESC`;
    const stmt = agentId
      ? this.db.prepare(query).bind(this.tenantId, agentId)
      : this.db.prepare(query).bind(this.tenantId);
    const { results } = await stmt.all<Record<string, unknown>>();
    return results ?? [];
  }

  async deleteKnowledgeSource(sourceId: string): Promise<boolean> {
    const res = await this.db
      .prepare('DELETE FROM knowledge_sources WHERE id = ? AND tenant_id = ?')
      .bind(sourceId, this.tenantId)
      .run();
    return (res.meta?.changes ?? 0) > 0;
  }

  async listMemories(limit = 100): Promise<Record<string, unknown>[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM customer_memories
          WHERE tenant_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
      )
      .bind(this.tenantId, limit)
      .all<Record<string, unknown>>();
    return results ?? [];
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    const res = await this.db
      .prepare('DELETE FROM customer_memories WHERE id = ? AND tenant_id = ?')
      .bind(memoryId, this.tenantId)
      .run();
    return (res.meta?.changes ?? 0) > 0;
  }

  async updateChannelLastSeen(channelId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE agent_channels
            SET status = 'connected', last_seen_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?`,
      )
      .bind(channelId, this.tenantId)
      .run();
  }

  async listAuditLogs(limit = 100, offset = 0): Promise<Record<string, unknown>[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, tenant_id, actor, action, resource_type, resource_id, details, ip_address, created_at
           FROM audit_log
          WHERE tenant_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
      )
      .bind(this.tenantId, limit, offset)
      .all<Record<string, unknown>>();
    return results ?? [];
  }

  async listSecurityAlerts(limit = 50): Promise<Record<string, unknown>[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM security_alerts
          WHERE tenant_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
      )
      .bind(this.tenantId, limit)
      .all<Record<string, unknown>>();
    return results ?? [];
  }
}

export function tenantRepo(db: D1Database, tenantId: string): TenantRepository {
  return new TenantRepository(db, tenantId);
}
