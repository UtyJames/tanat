/**
 * Tanat — Privacy & Security Centre Routes (`/api/v1/privacy`).
 *
 * Exposes real encryption status, key rotation/revocation, retention settings,
 * RBAC member/session controls, audit logs, security alerts, AI privacy state,
 * data export, and deletion requests.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { requireAnyScope, requireScope } from '../middleware/scopes';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { logAudit, requestIp } from '../utils/audit';
import {
  decryptField,
  getOrCreateActiveTenantKey,
  listTenantKeys,
  revokeTenantKey,
  rotateTenantKey,
} from '../services/encryption.service';
import { resolveKmsProvider } from '../services/kms.service';
import { getAiPrivacyStatus } from '../services/ai-privacy.service';
import {
  fetchNearAiAttestationReport,
  listTeeReceipts,
} from '../services/near-ai-tee.service';
import { NEAR_AI_DEFAULT_MODEL } from '../services/near-ai.service';
import { resolveEnclaveMode } from '../services/enclave-runtime.service';
import { recordSecurityAlert } from '../services/security-monitor.service';
import { ALL_GRANULAR_PERMISSIONS, normalizeRole } from '../middleware/rbac';

export const privacyRouter = new Hono<HonoEnv>();

privacyRouter.use('*', requireScope('read'));

const updateSettingsSchema = z
  .object({
    retention_days: z.number().int().min(7).max(3650).optional(),
    require_tee: z.boolean().optional(),
  })
  .strict();

const updateMemberRoleSchema = z
  .object({
    workspace_role: z.enum(['owner', 'admin', 'operator', 'member', 'auditor', 'viewer']),
    permissions: z.array(z.string().min(1).max(64)).max(30).optional(),
    assigned_agent_ids: z.array(z.string().min(1).max(100)).max(50).optional(),
  })
  .strict();

// ── GET /status — Complete Privacy Centre summary (real backend state) ─────
privacyRouter.get('/status', async (c) => {
  const tenantId = c.get('tenantId');
  const kms = resolveKmsProvider(c.env);

  await getOrCreateActiveTenantKey(c.env, c.env.DB, tenantId, c.get('apiKeyId'));
  const keys = await listTenantKeys(c.env.DB, tenantId);
  const activeKey = keys.find((k) => k.status === 'active') ?? null;

  const settings = await c.env.DB.prepare(
    'SELECT * FROM tenant_privacy_settings WHERE tenant_id = ?',
  )
    .bind(tenantId)
    .first<{
      retention_days: number;
      require_tee: number;
      deletion_requested_at: string | null;
      deletion_scheduled_for: string | null;
      updated_at: string | null;
    }>();

  const [memberCount, activeSessionCount, apiKeyCount, openAlerts] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS cnt FROM workspace_members WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ cnt: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM dashboard_sessions s
        JOIN dashboard_users u ON u.id = s.user_id
       WHERE u.tenant_id = ? AND s.revoked_at IS NULL AND s.expires_at > datetime('now')`,
    )
      .bind(tenantId)
      .first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS cnt FROM api_keys WHERE tenant_id = ? AND is_active = 1')
      .bind(tenantId)
      .first<{ cnt: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) AS cnt FROM security_alerts WHERE tenant_id = ? AND status = 'open'",
    )
      .bind(tenantId)
      .first<{ cnt: number }>(),
  ]);

  const requireTee = Boolean(settings?.require_tee);

  return c.json({
    data: {
      data_protection: {
        encryption_enabled: true,
        algorithm: 'AES-256-GCM',
        envelope_format: 'ENC:v1 (AAD-bound)',
        encrypted_fields: [
          'messages.content',
          'knowledge_sources.content',
          'customer_memories.fact',
        ],
        unencrypted_metadata: [
          'tenant_id',
          'record_id',
          'timestamps',
          'status',
          'knowledge_sources.label',
        ],
        kms: {
          provider: kms.providerName,
          key_id: kms.keyId,
          local_dev_mode: kms.isLocalDev,
        },
        active_key: activeKey,
        keys,
        retention_days: settings?.retention_days ?? 90,
        deletion_requested_at: settings?.deletion_requested_at ?? null,
        deletion_scheduled_for: settings?.deletion_scheduled_for ?? null,
        operator_trust_boundary:
          'Application workers unwrap tenant DEKs in memory to serve authenticated requests and AI inference. Database-only dumps cannot read encrypted payloads without KMS access.',
      },
      access_control: {
        current_role: c.get('workspaceRole') ?? 'api_key',
        current_scopes: c.get('scopes') ?? [],
        members_count: memberCount?.cnt ?? 0,
        active_sessions_count: activeSessionCount?.cnt ?? 0,
        active_api_keys_count: apiKeyCount?.cnt ?? 0,
        available_permissions: ALL_GRANULAR_PERMISSIONS,
      },
      ai_privacy: getAiPrivacyStatus(c.env, requireTee),
      security_events: {
        open_alerts_count: openAlerts?.cnt ?? 0,
      },
    },
  });
});

// ── POST /keys/rotate — Rotate tenant DEK (keeps older keys for read) ────
privacyRouter.post(
  '/keys/rotate',
  requireAnyScope(['privacy:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const rotated = await rotateTenantKey(c.env, c.env.DB, tenantId, c.get('apiKeyId'));
    return c.json({
      data: {
        id: rotated.id,
        version: rotated.version,
        kek_id: rotated.kek_id,
        algorithm: rotated.algorithm,
        status: rotated.status,
        created_at: rotated.created_at,
      },
    });
  },
);

// ── POST /keys/:id/revoke — Revoke a specific DEK version ────────────────
privacyRouter.post(
  '/keys/:id/revoke',
  requireAnyScope(['privacy:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const keyId = c.req.param('id');
    const ok = await revokeTenantKey(c.env.DB, tenantId, keyId, c.get('apiKeyId'));
    if (!ok) throw new NotFoundError('Tenant encryption key');
    return c.json({ data: { id: keyId, status: 'revoked' } });
  },
);

// ── PATCH /settings — Update retention & AI TEE requirement ──────────────
privacyRouter.patch(
  '/settings',
  requireAnyScope(['privacy:manage', 'admin']),
  validateBody(updateSettingsSchema),
  async (c) => {
    const tenantId = c.get('tenantId');
    const body = getValidatedBody<z.infer<typeof updateSettingsSchema>>(c);

    await c.env.DB.prepare(
      `INSERT INTO tenant_privacy_settings (tenant_id, retention_days, require_tee, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(tenant_id) DO UPDATE SET
         retention_days = COALESCE(?, retention_days),
         require_tee = COALESCE(?, require_tee),
         updated_at = datetime('now')`,
    )
      .bind(
        tenantId,
        body.retention_days ?? 90,
        body.require_tee ? 1 : 0,
        body.retention_days ?? null,
        body.require_tee === undefined ? null : body.require_tee ? 1 : 0,
      )
      .run();

    await logAudit(c.env.DB, {
      tenantId,
      action: 'privacy.settings_updated',
      resourceType: 'tenant_privacy_settings',
      resourceId: tenantId,
      actorId: c.get('apiKeyId'),
      details: body,
      ipAddress: requestIp(c),
    });

    const updated = await c.env.DB.prepare(
      'SELECT * FROM tenant_privacy_settings WHERE tenant_id = ?',
    )
      .bind(tenantId)
      .first();
    return c.json({ data: updated });
  },
);

// ── GET /audit-logs — Read tenant audit log ──────────────────────────────
privacyRouter.get(
  '/audit-logs',
  requireAnyScope(['audit:read', 'privacy:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') ?? 50)));
    const { results } = await c.env.DB.prepare(
      `SELECT id, tenant_id, actor, action, resource_type, resource_id, details, ip_address, created_at
         FROM audit_log
        WHERE tenant_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
    )
      .bind(tenantId, limit)
      .all();
    return c.json({ data: results ?? [] });
  },
);

// ── GET /alerts & POST /alerts/:id/resolve — Security events ─────────────
privacyRouter.get(
  '/alerts',
  requireAnyScope(['audit:read', 'privacy:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM security_alerts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`,
    )
      .bind(tenantId)
      .all();
    return c.json({ data: results ?? [] });
  },
);

privacyRouter.post(
  '/alerts/:id/resolve',
  requireAnyScope(['privacy:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const alertId = c.req.param('id');
    const res = await c.env.DB.prepare(
      `UPDATE security_alerts
          SET status = 'resolved', resolved_at = datetime('now')
        WHERE id = ? AND tenant_id = ?`,
    )
      .bind(alertId, tenantId)
      .run();
    if ((res.meta?.changes ?? 0) === 0) throw new NotFoundError('Security alert');
    return c.json({ data: { id: alertId, status: 'resolved' } });
  },
);

// ── GET /sessions & DELETE /sessions/:id — Active dashboard sessions ─────
privacyRouter.get(
  '/sessions',
  requireAnyScope(['privacy:manage', 'members:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { results } = await c.env.DB.prepare(
      `SELECT s.id, s.user_id, u.email, s.expires_at, s.last_used_at, s.revoked_at, s.created_at
         FROM dashboard_sessions s
         JOIN dashboard_users u ON u.id = s.user_id
        WHERE u.tenant_id = ?
        ORDER BY s.created_at DESC
        LIMIT 50`,
    )
      .bind(tenantId)
      .all();
    return c.json({ data: results ?? [] });
  },
);

privacyRouter.delete(
  '/sessions/:id',
  requireAnyScope(['privacy:manage', 'members:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const sessionId = c.req.param('id');
    const res = await c.env.DB.prepare(
      `UPDATE dashboard_sessions
          SET revoked_at = datetime('now')
        WHERE id = ? AND revoked_at IS NULL
          AND user_id IN (SELECT id FROM dashboard_users WHERE tenant_id = ?)`,
    )
      .bind(sessionId, tenantId)
      .run();

    if ((res.meta?.changes ?? 0) === 0) throw new NotFoundError('Dashboard session');

    await logAudit(c.env.DB, {
      tenantId,
      action: 'session.revoked',
      resourceType: 'dashboard_session',
      resourceId: sessionId,
      actorId: c.get('apiKeyId'),
      ipAddress: requestIp(c),
    });

    return c.json({ data: { id: sessionId, revoked: true } });
  },
);

// ── PATCH /members/:id/role — Granular RBAC role & permission assignment ─
privacyRouter.patch(
  '/members/:id/role',
  requireAnyScope(['members:manage', 'admin']),
  validateBody(updateMemberRoleSchema),
  async (c) => {
    const tenantId = c.get('tenantId');
    const memberId = c.req.param('id');
    const body = getValidatedBody<z.infer<typeof updateMemberRoleSchema>>(c);
    const callerRole = normalizeRole(c.get('workspaceRole') ?? 'owner');

    if (
      (body.workspace_role === 'owner' ||
        (body.permissions ?? []).includes('privacy:manage') ||
        (body.permissions ?? []).includes('admin')) &&
      callerRole !== 'owner' &&
      !(c.get('scopes') ?? []).includes('admin')
    ) {
      throw new ForbiddenError('Only workspace owners can grant owner or privacy admin privileges');
    }

    const mappedLegacyRole =
      body.workspace_role === 'member' || body.workspace_role === 'auditor'
        ? 'viewer'
        : body.workspace_role;

    const perms = (body.permissions ?? []).filter((p) => p !== '*');
    const res = await c.env.DB.prepare(
      `UPDATE workspace_members
          SET role = ?,
              workspace_role = ?,
              permissions = ?,
              assigned_agent_ids = ?,
              updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?`,
    )
      .bind(
        mappedLegacyRole,
        body.workspace_role,
        JSON.stringify(perms),
        JSON.stringify(body.assigned_agent_ids ?? []),
        memberId,
        tenantId,
      )
      .run();

    if ((res.meta?.changes ?? 0) === 0) throw new NotFoundError('Workspace member');

    await logAudit(c.env.DB, {
      tenantId,
      action: 'member.role_updated',
      resourceType: 'workspace_member',
      resourceId: memberId,
      actorId: c.get('apiKeyId'),
      details: { workspace_role: body.workspace_role, permissions: perms },
      ipAddress: requestIp(c),
    });

    return c.json({
      data: {
        id: memberId,
        workspace_role: body.workspace_role,
        permissions: perms,
        assigned_agent_ids: body.assigned_agent_ids ?? [],
      },
    });
  },
);

// ── POST /export — Tenant-scoped decrypted data export (audited) ─────────
privacyRouter.post(
  '/export',
  requireAnyScope(['export:data', 'privacy:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');

    const [agents, sessions, rawMessages, rawKnowledge, rawMemories] = await Promise.all([
      c.env.DB.prepare('SELECT id, name, slug, model, status, created_at FROM agents WHERE tenant_id = ?')
        .bind(tenantId)
        .all(),
      c.env.DB.prepare('SELECT id, installation_id, user_id, status, created_at FROM sessions WHERE tenant_id = ?')
        .bind(tenantId)
        .all(),
      c.env.DB.prepare('SELECT id, session_id, role, content, created_at FROM messages WHERE tenant_id = ? ORDER BY created_at ASC LIMIT 500')
        .bind(tenantId)
        .all<{ id: string; session_id: string; role: string; content: string; created_at: string }>(),
      c.env.DB.prepare('SELECT id, kind, label, uri, content, status, created_at FROM knowledge_sources WHERE tenant_id = ?')
        .bind(tenantId)
        .all<{ id: string; kind: string; label: string; uri: string | null; content: string | null; status: string; created_at: string }>(),
      c.env.DB.prepare('SELECT id, memory_type, fact, created_at FROM customer_memories WHERE tenant_id = ?')
        .bind(tenantId)
        .all<{ id: string; memory_type: string; fact: string; created_at: string }>(),
    ]);

    const messages = await Promise.all(
      (rawMessages.results ?? []).map(async (m) => ({
        ...m,
        content: await decryptField(
          c.env,
          c.env.DB,
          { tenantId, table: 'messages', recordId: m.id, field: 'content' },
          m.content,
        ),
      })),
    );

    const knowledge = await Promise.all(
      (rawKnowledge.results ?? []).map(async (k) => ({
        ...k,
        content: k.content
          ? await decryptField(
              c.env,
              c.env.DB,
              { tenantId, table: 'knowledge_sources', recordId: k.id, field: 'content' },
              k.content,
            )
          : null,
      })),
    );

    const memories = await Promise.all(
      (rawMemories.results ?? []).map(async (mem) => ({
        ...mem,
        fact: await decryptField(
          c.env,
          c.env.DB,
          { tenantId, table: 'customer_memories', recordId: mem.id, field: 'fact' },
          mem.fact,
        ),
      })),
    );

    await logAudit(c.env.DB, {
      tenantId,
      action: 'data.exported',
      resourceType: 'tenant',
      resourceId: tenantId,
      actorId: c.get('apiKeyId'),
      details: {
        agents: agents.results?.length ?? 0,
        sessions: sessions.results?.length ?? 0,
        messages: messages.length,
        knowledge: knowledge.length,
        memories: memories.length,
      },
      ipAddress: requestIp(c),
    });

    await recordSecurityAlert(c.env.DB, {
      tenantId,
      severity: 'medium',
      category: 'bulk_export',
      title: 'Full workspace data export executed',
      details: { messages: messages.length, knowledge: knowledge.length },
      actorId: c.get('apiKeyId'),
    });

    return c.json({
      data: {
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        agents: agents.results ?? [],
        sessions: sessions.results ?? [],
        messages,
        knowledge,
        memories,
      },
    });
  },
);

// ── POST /deletion-request — Request scheduled workspace data deletion ───
privacyRouter.post(
  '/deletion-request',
  requireAnyScope(['privacy:manage', 'admin']),
  async (c) => {
    const tenantId = c.get('tenantId');
    await c.env.DB.prepare(
      `INSERT INTO tenant_privacy_settings
         (tenant_id, deletion_requested_at, deletion_scheduled_for, updated_at)
       VALUES (?, datetime('now'), datetime('now', '+30 days'), datetime('now'))
       ON CONFLICT(tenant_id) DO UPDATE SET
         deletion_requested_at = datetime('now'),
         deletion_scheduled_for = datetime('now', '+30 days'),
         updated_at = datetime('now')`,
    )
      .bind(tenantId)
      .run();

    await logAudit(c.env.DB, {
      tenantId,
      action: 'privacy.deletion_requested',
      resourceType: 'tenant',
      resourceId: tenantId,
      actorId: c.get('apiKeyId'),
      ipAddress: requestIp(c),
    });

    const row = await c.env.DB.prepare(
      'SELECT deletion_requested_at, deletion_scheduled_for FROM tenant_privacy_settings WHERE tenant_id = ?',
    )
      .bind(tenantId)
      .first();

    return c.json({ data: row });
  },
);

// ── GET /tee-receipts — List per-inference cryptographic TEE receipts ─────
privacyRouter.get('/tee-receipts', async (c) => {
  const tenantId = c.get('tenantId');
  const receipts = await listTeeReceipts(c.env.DB, tenantId, 25);
  return c.json({ data: receipts });
});

// ── POST /tee-verify — Live nonce-bound NEAR AI TEE attestation check ─────
privacyRouter.post('/tee-verify', async (c) => {
  const tenantId = c.get('tenantId');
  const apiKey = (c.env.NEAR_AI_API_KEY ?? '').trim();
  if (!apiKey) {
    return c.json({
      data: {
        verified: false,
        reason: 'NEAR_AI_API_KEY is not configured in this environment.',
        enclave_mode: resolveEnclaveMode(c.env),
      },
    });
  }

  const body = await c.req.json().catch(() => ({})) as { model?: unknown };
  const model =
    typeof body.model === 'string' && body.model.trim().length > 0
      ? body.model.trim()
      : NEAR_AI_DEFAULT_MODEL;

  const report = await fetchNearAiAttestationReport({
    apiKey,
    model,
  });

  await logAudit(c.env.DB, {
    tenantId,
    action: 'privacy.tee_attestation_verified',
    resourceType: 'near_ai_model',
    resourceId: model,
    actorId: c.get('apiKeyId'),
    details: {
      signing_address: report.signingAddress,
      tdx_present: report.tdxPresent,
      gpu_attested: report.gpuAttested,
    },
    ipAddress: requestIp(c),
  });

  return c.json({
    data: {
      verified: report.tdxPresent || report.gpuAttested,
      enclave_mode: resolveEnclaveMode(c.env),
      report: {
        model: report.model,
        nonce: report.nonce,
        signing_address: report.signingAddress,
        signing_algo: report.signingAlgo,
        tdx_present: report.tdxPresent,
        gpu_attested: report.gpuAttested,
        gateway_attested: report.gatewayAttested,
        fetched_at: report.fetchedAt,
      },
    },
  });
});

