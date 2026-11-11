/**
 * Tanat — agent service.
 *
 * Data access layer for tenant-scoped agent definitions.
 */

import { generateId } from '../utils/crypto';
import { NotFoundError } from '../utils/errors';

export interface CreateAgentInput {
  name: string;
  slug: string;
  tenant_id: string;
  system_prompt: string;
  tools?: Record<string, unknown>[];
  model?: string;
  description?: string;
  config?: Record<string, unknown>;
  max_tokens?: number;
  temperature?: number;
}

export interface UpdateAgentInput {
  name?: string;
  system_prompt?: string;
  tools?: Record<string, unknown>[];
  model?: string;
  description?: string;
  config?: Record<string, unknown>;
  max_tokens?: number;
  temperature?: number;
  status?: string;
}

export interface AgentRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  version: number;
  system_prompt: string;
  tools: string;
  model: string;
  max_tokens: number;
  temperature: number;
  config: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function createAgent(
  db: D1Database,
  data: CreateAgentInput,
): Promise<AgentRow> {
  const id = generateId('agt');

  await db
    .prepare(
      `INSERT INTO agents (id, tenant_id, name, slug, description, version, system_prompt, tools, model, max_tokens, temperature, config, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
    )
    .bind(
      id,
      data.tenant_id,
      data.name,
      data.slug,
      data.description ?? null,
      data.system_prompt,
      data.tools ? JSON.stringify(data.tools) : '[]',
      data.model ?? 'z-ai/glm-5.3',
      data.max_tokens ?? 4096,
      data.temperature ?? 0.7,
      data.config ? JSON.stringify(data.config) : '{}',
    )
    .run();

  return getAgent(db, id, data.tenant_id);
}

export async function getAgent(
  db: D1Database,
  id: string,
  tenantId: string,
): Promise<AgentRow> {
  const row = await db
    .prepare("SELECT * FROM agents WHERE id = ? AND tenant_id = ? AND status != 'archived'")
    .bind(id, tenantId)
    .first<AgentRow>();

  if (!row) {
    throw new NotFoundError('Agent');
  }

  return row;
}

export async function listAgents(
  db: D1Database,
  tenantId: string,
  page = 1,
  limit = 20,
): Promise<{ agents: AgentRow[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await db
    .prepare("SELECT COUNT(*) as count FROM agents WHERE tenant_id = ? AND status != 'archived'")
    .bind(tenantId)
    .first<{ count: number }>();

  const { results } = await db
    .prepare(
      "SELECT * FROM agents WHERE tenant_id = ? AND status != 'archived' ORDER BY created_at DESC LIMIT ? OFFSET ?",
    )
    .bind(tenantId, limit, offset)
    .all<AgentRow>();

  return { agents: results ?? [], total: countResult?.count ?? 0 };
}

export async function updateAgent(
  db: D1Database,
  id: string,
  tenantId: string,
  data: UpdateAgentInput,
): Promise<AgentRow> {
  const existing = await getAgent(db, id, tenantId);

  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    values.push(data.name);
  }
  if (data.system_prompt !== undefined) {
    sets.push('system_prompt = ?');
    values.push(data.system_prompt);
  }
  if (data.tools !== undefined) {
    sets.push('tools = ?');
    values.push(JSON.stringify(data.tools));
  }
  if (data.model !== undefined) {
    sets.push('model = ?');
    values.push(data.model);
  }
  if (data.description !== undefined) {
    sets.push('description = ?');
    values.push(data.description);
  }
  if (data.config !== undefined) {
    sets.push('config = ?');
    values.push(JSON.stringify(data.config));
  }
  if (data.max_tokens !== undefined) {
    sets.push('max_tokens = ?');
    values.push(data.max_tokens);
  }
  if (data.temperature !== undefined) {
    sets.push('temperature = ?');
    values.push(data.temperature);
  }
  if (data.status !== undefined) {
    sets.push('status = ?');
    values.push(data.status);
  }

  if (sets.length === 0) {
    return existing;
  }

  sets.push('version = version + 1');
  sets.push("updated_at = datetime('now')");
  values.push(id, tenantId);

  await db
    .prepare(`UPDATE agents SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`)
    .bind(...values)
    .run();

  return getAgent(db, id, tenantId);
}

export async function archiveAgent(
  db: D1Database,
  id: string,
  tenantId: string,
): Promise<void> {
  await getAgent(db, id, tenantId);

  await db
    .prepare(
      "UPDATE agents SET status = 'archived', updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
    )
    .bind(id, tenantId)
    .run();
}
