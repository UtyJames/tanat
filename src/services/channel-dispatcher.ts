/**
 * Tanat — Channel Dispatcher Service
 *
 * Channel-agnostic pipeline that accepts incoming messages from
 * Telegram, WhatsApp, Slack, or other connected messaging surfaces,
 * routes them through the agent brain (Knowledge Base + Customer Memory
 * + NEAR AI Cloud inference), logs telemetry, and returns the response.
 */

import { generateId } from '../utils/crypto';
import { recordUsage } from './metering.service';
import {
  readyKnowledge,
  retrieveMemoryContext,
  extractAndStoreMemories,
} from './knowledge.service';
import {
  NearAiService,
  NEAR_AI_DEFAULT_MODEL,
  type ChatMessage,
} from './near-ai.service';
import { NotFoundError } from '../utils/errors';

export interface DispatchChannelMessageParams {
  tenantId: string;
  installationId: string;
  channelType: 'telegram' | 'whatsapp' | 'slack' | 'website';
  channelId?: string;
  externalUserId: string;
  messageText: string;
  metadata?: Record<string, unknown>;
}

export interface DispatchResult {
  content: string;
  sessionId: string;
  messageId: string;
  model: string | null;
  agentName: string;
}

function parseJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function dispatchChannelMessage(
  db: D1Database,
  nearAi: NearAiService,
  params: DispatchChannelMessageParams,
): Promise<DispatchResult> {
  const {
    tenantId,
    installationId,
    channelType,
    channelId,
    externalUserId,
    messageText,
    metadata,
  } = params;

  const startMs = Date.now();

  // 1. Load active installation + agent + tenant
  const row = await db
    .prepare(
      `SELECT i.id AS installation_id, i.config AS installation_config,
              a.id AS agent_id, a.name AS agent_name, a.description AS agent_description,
              a.system_prompt AS agent_prompt, a.model AS agent_model,
              a.max_tokens AS agent_max_tokens, a.temperature AS agent_temperature,
              t.name AS tenant_name, t.settings AS tenant_settings
         FROM installations i
         JOIN agents a ON a.id = i.agent_id
         JOIN tenants t ON t.id = i.tenant_id
        WHERE i.id = ? AND i.tenant_id = ? AND i.status = 'active'
          AND a.status = 'active'`,
    )
    .bind(installationId, tenantId)
    .first<{
      installation_id: string;
      installation_config: string;
      agent_id: string;
      agent_name: string;
      agent_description: string | null;
      agent_prompt: string;
      agent_model: string;
      agent_max_tokens: number;
      agent_temperature: number;
      tenant_name: string;
      tenant_settings: string;
    }>();

  if (!row) {
    throw new NotFoundError('Agent installation');
  }

  // 2. Find or create an active session for this user on this channel
  let session = await db
    .prepare(
      `SELECT id FROM sessions
        WHERE tenant_id = ? AND installation_id = ? AND user_id = ? AND status = 'active'
        ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(tenantId, installationId, externalUserId)
    .first<{ id: string }>();

  let sessionId: string;
  if (session) {
    sessionId = session.id;
  } else {
    sessionId = generateId('sess');
    await db
      .prepare(
        `INSERT INTO sessions (id, installation_id, tenant_id, user_id, metadata, status, started_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
      )
      .bind(
        sessionId,
        installationId,
        tenantId,
        externalUserId,
        JSON.stringify({
          channel: channelType,
          channel_id: channelId ?? null,
          ...(metadata ?? {}),
        }),
      )
      .run();

    await recordUsage(db, tenantId, 'api_call', 1, {
      endpoint: `channel.${channelType}.session.create`,
      channel: channelType,
    });
  }

  // 3. Save incoming user message
  const userMsgId = generateId('msg');
  await db
    .prepare(
      `INSERT INTO messages (id, session_id, tenant_id, role, content, created_at)
       VALUES (?, ?, ?, 'user', ?, datetime('now'))`,
    )
    .bind(userMsgId, sessionId, tenantId, messageText)
    .run();

  // 4. Retrieve knowledge and persistent memory
  const tenantSettings = parseJson(row.tenant_settings);
  const knowledge = await readyKnowledge(db, tenantId, row.agent_id);
  const memory = await retrieveMemoryContext(
    db,
    tenantId,
    externalUserId,
    row.agent_id,
  );

  // Background memory extraction
  await extractAndStoreMemories(db, {
    idGenerator: generateId,
    tenantId,
    externalUserId,
    agentId: row.agent_id,
    sessionId,
    userMessage: messageText,
  });

  // 5. Build prompt with history
  const history = await db
    .prepare(
      `SELECT role, content FROM messages
        WHERE session_id = ? AND tenant_id = ?
        ORDER BY created_at DESC LIMIT 16`,
    )
    .bind(sessionId, tenantId)
    .all<{ role: string; content: string }>();

  const channelLabel =
    channelType === 'telegram'
      ? 'Telegram'
      : channelType === 'whatsapp'
        ? 'WhatsApp'
        : channelType === 'slack'
          ? 'Slack'
          : 'chat';

  const systemPrompt = [
    `You are ${row.agent_name}, an official AI assistant for ${row.tenant_name}, answering via ${channelLabel}.`,
    row.agent_prompt,
    knowledge.context,
    memory.context,
    'Tanat Operating Rules:',
    `- Answer concisely and clearly, formatted appropriately for ${channelLabel}.`,
    '- Ground your responses strictly in approved business knowledge. If you do not know, say so politely.',
    '- Never invent pricing, order statuses, inventory, or internal policies.',
    '- If an action or human review is needed, guide the user on how the team can follow up.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history.results ?? [])
      .reverse()
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string',
      )
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
  ];

  let assistantContent: string;
  let usedModel: string | null = null;

  if (!nearAi.configured) {
    assistantContent =
      `Hello! I am ${row.agent_name} for ${row.tenant_name}. ` +
      'Our AI cloud provider is currently being configured. A team member will follow up shortly.';
  } else {
    try {
      const resolvedModel = row.agent_model.includes('/')
        ? row.agent_model
        : NEAR_AI_DEFAULT_MODEL;

      const result = await nearAi.chat({
        model: resolvedModel,
        messages,
        maxTokens: Math.min(Math.max(row.agent_max_tokens || 512, 128), 1024),
        temperature: row.agent_temperature ?? 0.4,
        requireTee: tenantSettings.allowNonTee !== true,
      });

      assistantContent =
        result.content.trim() ||
        'I received your message and am reviewing the details. How else may I assist you?';
      usedModel = result.model;

      if (result.usage.totalTokens > 0) {
        await recordUsage(db, tenantId, 'tokens', result.usage.totalTokens, {
          session_id: sessionId,
          model: result.model,
          channel: channelType,
        });
      }
    } catch (err) {
      console.error(`[channel-dispatcher] AI inference error:`, err);
      assistantContent =
        `Thank you for contacting ${row.tenant_name}. We have logged your request and a representative will follow up soon.`;
    }
  }

  // 6. Save assistant message
  const assistantMsgId = generateId('msg');
  await db
    .prepare(
      `INSERT INTO messages (id, session_id, tenant_id, role, content, created_at)
       VALUES (?, ?, ?, 'assistant', ?, datetime('now'))`,
    )
    .bind(assistantMsgId, sessionId, tenantId, assistantContent)
    .run();

  // 7. Update channel status & last_seen_at
  if (channelId) {
    try {
      await db
        .prepare(
          `UPDATE agent_channels
              SET status = 'connected', last_seen_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?`,
        )
        .bind(channelId, tenantId)
        .run();
    } catch {
      // Non-blocking
    }
  }

  // 8. Record operational run
  const durationMs = Math.max(1, Date.now() - startMs);
  try {
    await db
      .prepare(
        `INSERT INTO agent_runs
           (id, tenant_id, agent_id, session_id, channel_type, status, duration_ms,
            model, privacy_tier, tokens_used, knowledge_ids, tool_calls, summary)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, 'standard', 100, ?, '[]', ?)`,
      )
      .bind(
        generateId('run'),
        tenantId,
        row.agent_id,
        sessionId,
        channelType,
        durationMs,
        usedModel ?? NEAR_AI_DEFAULT_MODEL,
        JSON.stringify(knowledge.sources.map((s) => ({ id: s.id, label: s.label }))),
        messageText.slice(0, 140),
      )
      .run();
  } catch {
    // Non-blocking
  }

  return {
    content: assistantContent,
    sessionId,
    messageId: assistantMsgId,
    model: usedModel,
    agentName: row.agent_name,
  };
}

