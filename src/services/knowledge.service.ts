/**
 * Tanat — Knowledge Retrieval & Memory Service.
 *
 * Retrieves approved tenant/agent knowledge sources (`ready` status) and
 * persistent customer/business memories scoped strictly by `tenant_id`.
 */

import type { Env } from '../types';
import { decryptField, encryptField } from './encryption.service';
import { minimizeKnowledgeContext, redactSecrets } from './ai-privacy.service';

export interface KnowledgeSource {
  id: string;
  kind: string;
  label: string;
  uri?: string | null;
  content: string | null;
  status: string;
  agent_id?: string | null;
  created_at?: string;
}

export interface CustomerMemory {
  id: string;
  external_user_id: string | null;
  agent_id: string | null;
  memory_type: string;
  fact: string;
  created_at: string;
}

export async function readyKnowledge(
  db: D1Database,
  tenantId: string,
  agentId: string | null,
  maxChars = 24_000,
  env?: Env,
  userQuery = '',
): Promise<{ sources: KnowledgeSource[]; context: string }> {
  const { results } = await db
    .prepare(
      `SELECT id, kind, label, uri, content, status, agent_id, created_at
         FROM knowledge_sources
        WHERE tenant_id = ? AND status = 'ready'
          AND (agent_id IS NULL OR agent_id = ?)
          AND content IS NOT NULL AND length(trim(content)) > 0
        ORDER BY created_at DESC
        LIMIT 50`,
    )
    .bind(tenantId, agentId)
    .all<KnowledgeSource>();

  const rawSources = results ?? [];
  const sources: KnowledgeSource[] = await Promise.all(
    rawSources.map(async (source) => {
      if (env && source.content) {
        const plain = await decryptField(
          env,
          db,
          { tenantId, table: 'knowledge_sources', recordId: source.id, field: 'content' },
          source.content,
        );
        return { ...source, content: plain };
      }
      return source;
    }),
  );
  if (userQuery.trim()) {
    const minimized = minimizeKnowledgeContext(sources, userQuery, 10, maxChars);
    return { sources: minimized.selected, context: minimized.context };
  }

  const blocks: string[] = [];
  let used = 0;

  for (const source of sources) {
    const content = redactSecrets((source.content ?? '').trim());
    if (!content) continue;
    const safeLabel = source.label.replace(/"/g, '');
    const openTag = `<source label="${safeLabel}" kind="${source.kind}">\n`;
    const closeTag = `\n</source>`;
    const overhead = openTag.length + closeTag.length + 2;
    const remaining = maxChars - used - overhead;
    if (remaining < 120) break;

    const body =
      content.length <= remaining
        ? content
        : `${content.slice(0, remaining - 16).trimEnd()}\n[...truncated]`;
    const block = `${openTag}${body}${closeTag}`;
    blocks.push(block);
    used += block.length + 2;
  }

  return {
    sources,
    context:
      blocks.length > 0
        ? `Approved business knowledge. Use it when relevant, cite the source label when helpful, and state clearly when a question falls outside it:\n\n${blocks.join('\n\n')}`
        : '',
  };
}

export async function retrieveMemoryContext(
  db: D1Database,
  tenantId: string,
  externalUserId: string | null | undefined,
  agentId: string | null,
  env?: Env,
): Promise<{ memories: CustomerMemory[]; context: string }> {
  try {
    const { results } = await db
      .prepare(
        `SELECT id, external_user_id, agent_id, memory_type, fact, created_at
           FROM customer_memories
          WHERE tenant_id = ?
            AND (
              memory_type = 'business_context'
              OR (external_user_id IS NOT NULL AND external_user_id = ?)
              OR (external_user_id IS NULL AND (agent_id IS NULL OR agent_id = ?))
            )
          ORDER BY created_at DESC
          LIMIT 15`,
      )
      .bind(tenantId, externalUserId ?? '__none__', agentId)
      .all<CustomerMemory>();

    const rawMemories = results ?? [];
    const memories: CustomerMemory[] = await Promise.all(
      rawMemories.map(async (mem) => {
        if (env && mem.fact) {
          const plain = await decryptField(
            env,
            db,
            { tenantId, table: 'customer_memories', recordId: mem.id, field: 'fact' },
            mem.fact,
          );
          return { ...mem, fact: plain };
        }
        return mem;
      }),
    );
    if (memories.length === 0) {
      return { memories: [], context: '' };
    }

    const lines = memories.map(
      (mem) => `- (${mem.memory_type}) ${mem.fact}`,
    );
    return {
      memories,
      context: `Workspace & User Memory (persisted across conversations):\n${lines.join('\n')}`,
    };
  } catch {
    return { memories: [], context: '' };
  }
}

/**
 * Lightweight deterministic memory extractor: captures explicit user/business
 * facts (preferences, account identifiers, company context, contact details)
 * without requiring an extra LLM call.
 */
export async function extractAndStoreMemories(
  db: D1Database,
  input: {
    idGenerator: (prefix: string) => string;
    tenantId: string;
    externalUserId?: string | null;
    agentId: string;
    sessionId: string;
    userMessage: string;
    env?: Env;
  },
): Promise<void> {
  const text = input.userMessage.trim();
  if (text.length < 8 || text.length > 600) return;

  const facts: Array<{ type: 'fact' | 'preference' | 'business_context'; fact: string }> = [];

  const nameMatch = text.match(/\b(?:my name is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (nameMatch) {
    facts.push({ type: 'fact', fact: `User name: ${nameMatch[1]}` });
  }

  const nearMatch = text.match(/\b([a-z0-9_-]+\.(?:near|testnet))\b/i);
  if (nearMatch) {
    facts.push({ type: 'preference', fact: `Referenced NEAR account: ${nearMatch[1].toLowerCase()}` });
  }

  const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    facts.push({ type: 'fact', fact: `Contact email mentioned: ${emailMatch[1].toLowerCase()}` });
  }

  const prefMatch = text.match(/\b(?:i prefer|please always|remember that)\s+(.{5,180})/i);
  if (prefMatch) {
    facts.push({ type: 'preference', fact: prefMatch[1].trim() });
  }

  for (const item of facts) {
    try {
      const memId = input.idGenerator('mem');
      const storedFact = input.env
        ? await encryptField(
            input.env,
            db,
            { tenantId: input.tenantId, table: 'customer_memories', recordId: memId, field: 'fact' },
            item.fact,
          )
        : item.fact;
      await db
        .prepare(
          `INSERT INTO customer_memories (id, tenant_id, external_user_id, agent_id, session_id, memory_type, fact)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          memId,
          input.tenantId,
          input.externalUserId ?? null,
          input.agentId,
          input.sessionId,
          item.type,
          storedFact,
        )
        .run();
    } catch {
      // Non-blocking memory persistence.
    }
  }
}
