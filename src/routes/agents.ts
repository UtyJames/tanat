/**
 * Tanat — Agent routes
 *
 * CRUD for agent definitions. Agents are global but installations
 * bind them to a specific tenant.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import * as agentService from '../services/agent.service';
import { logAudit } from '../utils/audit';
import { requireScopeForMethod } from '../middleware/scopes';
import { parsePagination } from '../utils/pagination';

export const agentsRouter = new Hono<HonoEnv>();

agentsRouter.use('*', requireScopeForMethod('read', 'write'));

// ── Schemas ───────────────────────────────────────────────────────────
const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase alphanumeric with hyphens'),
  system_prompt: z.string().min(1).max(32000),
  description: z.string().max(2000).optional(),
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  model: z.string().max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  system_prompt: z.string().min(1).max(32000).optional(),
  description: z.string().max(2000).optional(),
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  model: z.string().max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ── GET / — list agents ───────────────────────────────────────────────
agentsRouter.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const { page, limit } = parsePagination({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  });

  const result = await agentService.listAgents(c.env.DB, tenantId, page, limit);
  return c.json({ data: result.agents, meta: { total: result.total, page, limit } });
});

// ── GET /:id — get agent ──────────────────────────────────────────────
agentsRouter.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const agent = await agentService.getAgent(c.env.DB, c.req.param('id'), tenantId);
  return c.json({ data: agent });
});

// ── POST / — create agent ─────────────────────────────────────────────
agentsRouter.post('/', validateBody(createAgentSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof createAgentSchema>>(c);
  const agent = await agentService.createAgent(c.env.DB, { ...body, tenant_id: tenantId });

  await logAudit(c.env.DB, {
    tenantId,
    action: 'agent.created',
    resourceType: 'agent',
    resourceId: agent.id,
    actorId: c.get('apiKeyId'),
  });

  return c.json({ data: agent }, 201);
});

// ── PATCH /:id — update agent ─────────────────────────────────────────
agentsRouter.patch('/:id', validateBody(updateAgentSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = getValidatedBody<z.infer<typeof updateAgentSchema>>(c);
  const agent = await agentService.updateAgent(c.env.DB, c.req.param('id'), tenantId, body);

  await logAudit(c.env.DB, {
    tenantId,
    action: 'agent.updated',
    resourceType: 'agent',
    resourceId: agent.id,
    actorId: c.get('apiKeyId'),
  });

  return c.json({ data: agent });
});

// ── DELETE /:id — archive agent ───────────────────────────────────────
agentsRouter.delete('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const agentId = c.req.param('id');

  await agentService.archiveAgent(c.env.DB, agentId, tenantId);

  await logAudit(c.env.DB, {
    tenantId,
    action: 'agent.archived',
    resourceType: 'agent',
    resourceId: agentId,
    actorId: c.get('apiKeyId'),
  });

  return c.json({ data: { archived: true } });
});

