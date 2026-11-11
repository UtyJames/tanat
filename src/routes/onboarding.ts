/**
 * Tanat — workspace onboarding.
 *
 * OTP verification provisions the tenant so the user always has a workspace.
 * This route is the second half: it records the business profile, turns the
 * starter agent into the agent the owner asked for, records channel intent, and
 * issues the first publishable key for website deployments.
 *
 * Nothing here claims a channel is live. Website and API are usable
 * immediately; messaging channels stay `pending` until their credentials are
 * actually connected.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generateId, generatePublishableKey, hashApiKey } from '../utils/crypto';
import { logAudit } from '../utils/audit';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { findTemplate, slugify } from '../services/agent-templates';

export const onboardingRouter = new Hono<HonoEnv>();

const CHANNELS = ['website', 'whatsapp', 'telegram', 'slack', 'email', 'api'] as const;

const businessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  industry: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional().default(''),
  website: z.string().trim().max(300).optional().default(''),
  email: z.string().trim().max(254).optional().default(''),
  country: z.string().trim().max(80).optional().default(''),
  timezone: z.string().trim().max(80).optional().default(''),
});

const agentSchema = z.object({
  template_id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(80),
  purpose: z.string().trim().max(1000).optional().default(''),
  tone: z.enum(['friendly', 'professional', 'concise', 'warm']).default('friendly'),
  responsibilities: z.array(z.string().trim().max(200)).max(12).optional().default([]),
  avoid: z.string().trim().max(1000).optional().default(''),
  escalation: z.string().trim().max(1000).optional().default(''),
});

const onboardingSchema = z
  .object({
    business: businessSchema,
    agent: agentSchema,
    channels: z.array(z.enum(CHANNELS)).min(1).max(CHANNELS.length),
    knowledge: z
      .object({
        website: z.boolean().optional().default(false),
        notes: z.string().trim().max(8000).optional().default(''),
        faqs: z.string().trim().max(8000).optional().default(''),
      })
      .optional()
      .default({ website: false, notes: '', faqs: '' }),
    permissions: z
      .object({
        read_knowledge: z.boolean().optional().default(true),
        propose_actions: z.boolean().optional().default(false),
        require_human_approval: z.boolean().optional().default(true),
        restricted_actions: z.array(z.string()).optional().default([]),
      })
      .optional(),
    selected_capabilities: z.array(z.string()).optional().default([]),
    additional_templates: z.array(z.string()).max(8).optional().default([]),
    step: z.number().int().min(0).max(12).optional(),
    complete: z.boolean().optional().default(true),
  })
  .strict();

const publishableKeySchema = z
  .object({
    name: z.string().trim().min(1).max(80).default('Website widget'),
    origins: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(300)
          .refine((value) => value === '*' || /^https?:\/\/[^/\s]+$/.test(value), {
            message: 'Origins must be http(s) origins without a path',
          }),
      )
      .min(1)
      .max(20),
    installation_id: z.string().min(1).max(100).optional(),
  })
  .strict();

interface TenantSettings {
  business?: Record<string, unknown>;
  onboarding?: Record<string, unknown>;
  [key: string]: unknown;
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

export function appUrl(env: Env): string {
  const configured = (env.AUTH_APP_URL ?? '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return 'https://tanat-web.pages.dev';
}

export function widgetSnippet(env: Env, publishableKey: string, installationId: string): string {
  return `<!-- Tanat widget — paste once before </body> -->
<script
  src="${appUrl(env)}/embed/tanat-widget.js"
  data-key="${publishableKey}"
  data-agent="${installationId}"
  data-theme="light"
  defer
></script>`;
}

async function issuePublishableKey(
  env: Env,
  input: {
    tenantId: string;
    installationId: string;
    name: string;
    origins: string[];
  },
): Promise<{ id: string; key: string; prefix: string }> {
  const salt = env.API_KEY_SALT ?? '';
  if (!salt) throw new AppError('API_KEY_SALT is not configured', 500, 'CONFIG_ERROR');

  const { key, prefix } = generatePublishableKey();
  const keyHash = await hashApiKey(key, salt);
  const id = generateId('pk');

  await env.DB.prepare(
    `INSERT INTO publishable_keys
       (id, tenant_id, installation_id, key_hash, key_prefix, name, allowed_origins, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  )
    .bind(
      id,
      input.tenantId,
      input.installationId,
      keyHash,
      prefix,
      input.name,
      JSON.stringify(input.origins),
    )
    .run();

  return { id, key, prefix };
}

function safeOrigins(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().replace(/\/$/, ''))
        .filter((value) => value === '*' || /^https?:\/\/[^/\s]+$/.test(value)),
    ),
  );
}

// ── GET /onboarding — resume state ────────────────────────────────────
onboardingRouter.get('/', async (c) => {
  const tenantId = c.get('tenantId');

  const tenant = await c.env.DB.prepare(
    'SELECT id, name, slug, settings, created_at FROM tenants WHERE id = ? AND status = ?',
  )
    .bind(tenantId, 'active')
    .first<{ id: string; name: string; slug: string; settings: string; created_at: string }>();

  if (!tenant) throw new NotFoundError('Tenant');

  const settings = parseJson(tenant.settings) as TenantSettings;

  const { results: agents } = await c.env.DB.prepare(
    `SELECT a.id, a.name, a.slug, a.description, a.config, a.model, a.status,
            i.id AS installation_id, i.status AS installation_status
       FROM agents a
       LEFT JOIN installations i ON i.agent_id = a.id AND i.status != 'removed'
      WHERE a.tenant_id = ? AND a.status != 'archived'
      ORDER BY a.created_at ASC`,
  )
    .bind(tenantId)
    .all();

  const { results: channels } = await c.env.DB.prepare(
    'SELECT channel, status, installation_id, last_seen_at FROM agent_channels WHERE tenant_id = ?',
  )
    .bind(tenantId)
    .all();

  const key = await c.env.DB.prepare(
    `SELECT id, key_prefix, name, allowed_origins, created_at
       FROM publishable_keys
      WHERE tenant_id = ? AND is_active = 1
      ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(tenantId)
    .first<{ id: string; key_prefix: string; name: string; allowed_origins: string; created_at: string }>();

  return c.json({
    data: {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      business: settings.business ?? null,
      onboarding: settings.onboarding ?? { completed: false, step: 0 },
      agents: agents ?? [],
      channels: channels ?? [],
      publishable_key: key
        ? { ...key, allowed_origins: parseJson(key.allowed_origins) }
        : null,
    },
  });
});

// ── POST /onboarding — record setup and deploy the first agent ────────
onboardingRouter.post('/', validateBody(onboardingSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof onboardingSchema>>(c);

  const tenant = await c.env.DB.prepare(
    'SELECT id, name, slug, settings FROM tenants WHERE id = ? AND status = ?',
  )
    .bind(tenantId, 'active')
    .first<{ id: string; name: string; slug: string; settings: string }>();

  if (!tenant) throw new NotFoundError('Tenant');

  const template = findTemplate(body.agent.template_id);
  const now = new Date().toISOString();

  const business = {
    name: body.business.name,
    industry: body.business.industry,
    description: body.business.description,
    website: body.business.website,
    email: body.business.email,
    country: body.business.country,
    timezone: body.business.timezone,
  };

  const responsibilities =
    body.agent.responsibilities.length > 0
      ? body.agent.responsibilities
      : template.responsibilities;

  const agentConfig = {
    template_id: template.id,
    category: template.category,
    purpose: body.agent.purpose || template.summary,
    tone: body.agent.tone,
    responsibilities,
    avoid: body.agent.avoid || template.avoid,
    escalation: body.agent.escalation,
    permissions: body.permissions ?? {
      read_knowledge: true,
      propose_actions: false,
      require_human_approval: true,
      restricted_actions: ['unapproved_refunds', 'account_ownership_changes', 'unauthorised_transfers'],
    },
    lifecycle: body.complete ? 'published' : 'draft',
    onboarded_at: now,
  };

  const prompt = [
    template.prompt,
    body.agent.purpose ? `Purpose: ${body.agent.purpose}` : '',
    `Tone: ${body.agent.tone}.`,
    `Responsibilities:\n- ${responsibilities.join('\n- ')}`,
    `Do not: ${agentConfig.avoid}`,
    body.agent.escalation ? `Escalate to: ${body.agent.escalation}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const settings = parseJson(tenant.settings) as TenantSettings;
  const nextSettings: TenantSettings = {
    ...settings,
    business,
    onboarding: {
      completed: body.complete,
      step: body.step ?? (body.complete ? 10 : 5),
      completed_at: body.complete ? now : null,
      channels: body.channels,
      selected_capabilities: body.selected_capabilities,
    },
  };

  // Reuse the starter agent created at OTP verification. It is the only agent
  // this route can safely assume exists, and repurposing it avoids leaving a
  // confusing orphan called "Store Assistant" in a support workspace.
  const starter = await c.env.DB.prepare(
    `SELECT id, slug FROM agents
      WHERE tenant_id = ? AND status != 'archived'
      ORDER BY created_at ASC LIMIT 1`,
  )
    .bind(tenantId)
    .first<{ id: string; slug: string }>();

  const agentId = starter?.id ?? generateId('agt');
  const slugBase = slugify(body.agent.name);
  const slugTaken = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE tenant_id = ? AND slug = ? AND id != ?',
  )
    .bind(tenantId, slugBase, agentId)
    .first();
  const slug = slugTaken ? `${slugBase}-${agentId.slice(-4)}` : slugBase;

  if (starter) {
    await c.env.DB.prepare(
      `UPDATE agents
          SET name = ?, slug = ?, description = ?, system_prompt = ?, config = ?,
              updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?`,
    )
      .bind(
        body.agent.name,
        slug,
        body.agent.purpose || template.summary,
        prompt,
        JSON.stringify(agentConfig),
        agentId,
        tenantId,
      )
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO agents
         (id, tenant_id, name, slug, description, system_prompt, tools, model,
          max_tokens, temperature, config, status)
       VALUES (?, ?, ?, ?, ?, ?, '[]', 'z-ai/glm-5.3', 4096, 0.4, ?, 'active')`,
    )
      .bind(
        agentId,
        tenantId,
        body.agent.name,
        slug,
        body.agent.purpose || template.summary,
        prompt,
        JSON.stringify(agentConfig),
      )
      .run();
  }

  const installation = await c.env.DB.prepare(
    "SELECT id FROM installations WHERE tenant_id = ? AND agent_id = ? AND status != 'removed'",
  )
    .bind(tenantId, agentId)
    .first<{ id: string }>();

  const installationId = installation?.id ?? generateId('inst');
  const installationStatus = body.complete ? 'active' : 'paused';

  if (installation) {
    await c.env.DB.prepare(
      "UPDATE installations SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
    )
      .bind(installationStatus, installationId, tenantId)
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO installations (id, tenant_id, agent_id, config, status)
       VALUES (?, ?, ?, '{}', ?)`,
    )
      .bind(installationId, tenantId, agentId, installationStatus)
      .run();
  }

  // Record channels. Only API is immediately usable without extra setup;
  // website becomes connected after the first widget message.
  for (const channel of body.channels) {
    const status: 'connected' | 'pending' =
      channel === 'api' ? 'connected' : 'pending';
    await c.env.DB.prepare(
      `INSERT INTO agent_channels (id, tenant_id, installation_id, channel, status, config)
       VALUES (?, ?, ?, ?, ?, '{}')
       ON CONFLICT(installation_id, channel)
       DO UPDATE SET status = excluded.status, updated_at = datetime('now')`,
    )
      .bind(generateId('chn'), tenantId, installationId, channel, status)
      .run();
  }

  // Knowledge notes are stored as a text source. They are used verbatim in the
  // agent prompt; website imports stay pending because there is no crawler.
  if (body.knowledge.website && body.business.website) {
    await c.env.DB.prepare(
      `INSERT INTO knowledge_sources (id, tenant_id, agent_id, kind, label, uri, status)
       VALUES (?, ?, ?, 'website', ?, ?, 'pending')`,
    )
      .bind(
        generateId('knw'),
        tenantId,
        agentId,
        body.business.website,
        body.business.website,
      )
      .run();
  }

  if (body.knowledge.notes) {
    await c.env.DB.prepare(
      `INSERT INTO knowledge_sources (id, tenant_id, agent_id, kind, label, content, status)
       VALUES (?, ?, ?, 'text', 'Business overview & policies', ?, 'ready')`,
    )
      .bind(generateId('knw'), tenantId, agentId, body.knowledge.notes)
      .run();
  }

  if (body.knowledge.faqs) {
    await c.env.DB.prepare(
      `INSERT INTO knowledge_sources (id, tenant_id, agent_id, kind, label, content, status)
       VALUES (?, ?, ?, 'faq', 'Frequently asked questions', ?, 'ready')`,
    )
      .bind(generateId('knw'), tenantId, agentId, body.knowledge.faqs)
      .run();
  }

  // Provision any additional recommended agents selected during onboarding
  for (const extraTemplateId of body.additional_templates) {
    if (extraTemplateId === template.id) continue;
    const extraTpl = findTemplate(extraTemplateId);
    const extraSlug = slugify(extraTpl.name);
    const existingExtra = await c.env.DB.prepare(
      'SELECT id FROM agents WHERE tenant_id = ? AND slug = ?',
    )
      .bind(tenantId, extraSlug)
      .first();
    if (existingExtra) continue;

    const extraAgentId = generateId('agt');
    const extraInstId = generateId('inst');
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO agents
           (id, tenant_id, name, slug, description, system_prompt, tools, model,
            max_tokens, temperature, config, status)
         VALUES (?, ?, ?, ?, ?, ?, '[]', 'z-ai/glm-5.3', 4096, 0.4, ?, 'active')`,
      ).bind(
        extraAgentId,
        tenantId,
        extraTpl.name,
        extraSlug,
        extraTpl.summary,
        extraTpl.prompt,
        JSON.stringify({
          template_id: extraTpl.id,
          category: extraTpl.category,
          purpose: extraTpl.summary,
          tone: body.agent.tone,
          responsibilities: extraTpl.responsibilities,
          avoid: extraTpl.avoid,
          lifecycle: 'draft',
        }),
      ),
      c.env.DB.prepare(
        `INSERT INTO installations (id, tenant_id, agent_id, config, status)
         VALUES (?, ?, ?, '{}', 'paused')`,
      ).bind(extraInstId, tenantId, extraAgentId),
    ]);
  }

  await c.env.DB.prepare(
    "UPDATE tenants SET name = ?, settings = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(body.business.name, JSON.stringify(nextSettings), tenantId)
    .run();

  // Issue one publishable key for website deployments. Rotating is explicit, so
  // an existing key is never silently invalidated by re-running onboarding.
  let publishable: { id: string; key: string; prefix: string } | null = null;
  let keyRow = await c.env.DB.prepare(
    `SELECT id, key_prefix FROM publishable_keys
      WHERE tenant_id = ? AND installation_id = ? AND is_active = 1
      ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(tenantId, installationId)
    .first<{ id: string; key_prefix: string }>();

  if (body.channels.includes('website') && !keyRow) {
    const origins = body.business.website
      ? safeOrigins([normalizeOrigin(body.business.website)])
      : ['*'];
    publishable = await issuePublishableKey(c.env, {
      tenantId,
      installationId,
      name: 'Website widget',
      origins,
    });
    keyRow = { id: publishable.id, key_prefix: publishable.prefix };
  }

  await logAudit(c.env.DB, {
    tenantId,
    action: 'onboarding.completed',
    resourceType: 'tenant',
    resourceId: tenantId,
    actorId: c.get('apiKeyId'),
    details: {
      agent_id: agentId,
      template: template.id,
      channels: body.channels,
      publishable_key_created: publishable !== null,
    },
  });

  return c.json({
    data: {
      tenant: { id: tenantId, name: body.business.name },
      agent: {
        id: agentId,
        name: body.agent.name,
        slug,
        installation_id: installationId,
        status: body.complete ? 'published' : 'draft',
      },
      channels: body.channels.map((channel) => ({
        channel,
        status: channel === 'api' ? 'connected' : 'pending',
      })),
      publishable_key: publishable
        ? { id: publishable.id, key: publishable.key, prefix: publishable.prefix }
        : keyRow
          ? { id: keyRow.id, key: null, prefix: keyRow.key_prefix }
          : null,
      snippet:
        publishable && body.channels.includes('website')
          ? widgetSnippet(c.env, publishable.key, installationId)
          : null,
      onboarding: nextSettings.onboarding,
    },
  });
});

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '*';
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return '*';
  }
}

// ── Publishable keys ──────────────────────────────────────────────────
onboardingRouter.get('/keys', async (c) => {
  const tenantId = c.get('tenantId');
  const { results } = await c.env.DB.prepare(
    `SELECT id, installation_id, key_prefix, name, allowed_origins, last_used_at, created_at
       FROM publishable_keys WHERE tenant_id = ? AND is_active = 1
      ORDER BY created_at DESC`,
  )
    .bind(tenantId)
    .all();

  return c.json({
    data: (results ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      return {
        ...record,
        allowed_origins: parseJson(String(record.allowed_origins ?? '[]')),
      };
    }),
  });
});

onboardingRouter.post('/keys', validateBody(publishableKeySchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof publishableKeySchema>>(c);

  const installation = body.installation_id
    ? await c.env.DB.prepare(
        "SELECT id FROM installations WHERE id = ? AND tenant_id = ? AND status = 'active'",
      )
        .bind(body.installation_id, tenantId)
        .first<{ id: string }>()
    : await c.env.DB.prepare(
        "SELECT id FROM installations WHERE tenant_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1",
      )
        .bind(tenantId)
        .first<{ id: string }>();

  if (!installation) throw new NotFoundError('Agent installation');

  const created = await issuePublishableKey(c.env, {
    tenantId,
    installationId: installation.id,
    name: body.name,
    origins: safeOrigins(body.origins),
  });

  await logAudit(c.env.DB, {
    tenantId,
    action: 'publishable_key.created',
    resourceType: 'publishable_key',
    resourceId: created.id,
    actorId: c.get('apiKeyId'),
    details: { origins: safeOrigins(body.origins), installation_id: installation.id },
  });

  return c.json(
    {
      data: {
        id: created.id,
        key: created.key,
        prefix: created.prefix,
        installation_id: installation.id,
        allowed_origins: safeOrigins(body.origins),
        snippet: widgetSnippet(c.env, created.key, installation.id),
      },
      warning: 'This key is shown once. You can rotate it from the dashboard.',
    },
    201,
  );
});

onboardingRouter.delete('/keys/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const result = await c.env.DB.prepare(
    "UPDATE publishable_keys SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND tenant_id = ? AND is_active = 1",
  )
    .bind(c.req.param('id'), tenantId)
    .run();

  if (!result.meta.changes) throw new NotFoundError('Publishable key');

  await logAudit(c.env.DB, {
    tenantId,
    action: 'publishable_key.revoked',
    resourceType: 'publishable_key',
    resourceId: c.req.param('id'),
    actorId: c.get('apiKeyId'),
  });

  return c.json({ data: { revoked: true } });
});

// ── Channels ──────────────────────────────────────────────────────────
onboardingRouter.get('/channels', async (c) => {
  const tenantId = c.get('tenantId');
  const { results } = await c.env.DB.prepare(
    `SELECT ch.*, a.name AS agent_name, a.id AS agent_id
       FROM agent_channels ch
       JOIN installations i ON i.id = ch.installation_id
       JOIN agents a ON a.id = i.agent_id
      WHERE ch.tenant_id = ?
      ORDER BY ch.created_at ASC`,
  )
    .bind(tenantId)
    .all();

  return c.json({ data: results ?? [] });
});

const channelUpdateSchema = z
  .object({
    status: z.enum(['connected', 'pending', 'error', 'disabled']),
  })
  .strict();

onboardingRouter.patch('/channels/:id', validateBody(channelUpdateSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof channelUpdateSchema>>(c);

  const exists = await c.env.DB.prepare(
    'SELECT channel FROM agent_channels WHERE id = ? AND tenant_id = ?',
  )
    .bind(c.req.param('id'), tenantId)
    .first<{ channel: string }>();

  if (!exists) throw new NotFoundError('Channel');

  // Messaging channels cannot be marked connected from the dashboard until the
  // provider handshake exists. Refuse rather than record a fake success.
  if (
    body.status === 'connected' &&
    ['whatsapp', 'telegram', 'slack', 'email'].includes(exists.channel)
  ) {
    throw new ValidationError(
      `${exists.channel} connections are not available in this build. The channel stays pending until its connector ships.`,
    );
  }

  await c.env.DB.prepare(
    "UPDATE agent_channels SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
  )
    .bind(body.status, c.req.param('id'), tenantId)
    .run();

  return c.json({ data: { id: c.req.param('id'), status: body.status } });
});

// ── PATCH /onboarding/state — persist step progress without deploying ─
const progressSchema = z
  .object({
    step: z.number().int().min(0).max(12),
    draft: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

onboardingRouter.patch('/state', validateBody(progressSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof progressSchema>>(c);

  const tenant = await c.env.DB.prepare(
    'SELECT settings FROM tenants WHERE id = ? AND status = ?',
  )
    .bind(tenantId, 'active')
    .first<{ settings: string }>();

  if (!tenant) throw new NotFoundError('Tenant');

  const settings = parseJson(tenant.settings) as TenantSettings;
  const currentOnboarding = (settings.onboarding ?? {}) as Record<string, unknown>;
  const nextSettings: TenantSettings = {
    ...settings,
    onboarding: {
      ...currentOnboarding,
      step: body.step,
      draft: body.draft ?? currentOnboarding.draft ?? {},
      updated_at: new Date().toISOString(),
    },
  };

  await c.env.DB.prepare(
    "UPDATE tenants SET settings = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(JSON.stringify(nextSettings), tenantId)
    .run();

  return c.json({ data: nextSettings.onboarding });
});
