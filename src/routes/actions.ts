/**
 * Tanat — Action routes (Approval System)
 *
 * Actions are proposed by the AI agent and must be explicitly approved by a
 * different credential before any money moves. Execution is idempotent and
 * claimed atomically (security review H-01/H-02/H-06).
 */

import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import * as actionService from '../services/action.service';
import { NearService } from '../services/near.service';
import { recordUsage } from '../services/metering.service';
import { logAudit, requestIp } from '../utils/audit';
import { AppError } from '../utils/errors';
import { requireAnyScope } from '../middleware/scopes';
import { parsePagination } from '../utils/pagination';

export function createActionsRouter(
  nearServiceFactory: () => NearService = () => new NearService(),
): Hono<HonoEnv> {
const actionsRouter = new Hono<HonoEnv>();

// ── GET / — list actions ──────────────────────────────────────────────
actionsRouter.get(
  '/',
  requireAnyScope(['actions:read', 'actions']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const status = c.req.query('status');
    const sessionId = c.req.query('session_id');
    const { page, limit } = parsePagination({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    });

    const result = await actionService.listActions(c.env.DB, tenantId, {
      status,
      session_id: sessionId,
      page,
      limit,
    });

    return c.json({
      data: result.actions,
      meta: { total: result.total, page, limit },
    });
  },
);

// ── GET /:id — get action detail ──────────────────────────────────────
actionsRouter.get(
  '/:id',
  requireAnyScope(['actions:read', 'actions']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const action = await actionService.getAction(
      c.env.DB,
      c.req.param('id'),
      tenantId,
    );
    return c.json({ data: action });
  },
);

// ── POST /:id/approve — approve an action ─────────────────────────────
actionsRouter.post(
  '/:id/approve',
  requireAnyScope(['actions:approve', 'actions']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const actionId = c.req.param('id');
    const approvedBy = c.get('apiKeyId');

    const action = await actionService.approveAction(
      c.env.DB,
      actionId,
      tenantId,
      approvedBy,
    );

    await logAudit(c.env.DB, {
      tenantId,
      action:
        action.status === 'approved'
          ? 'action.approved'
          : 'action.approval_recorded',
      resourceType: 'action',
      resourceId: actionId,
      actorId: approvedBy,
      details: {
        type: action.type,
        status: action.status,
        approvals: action.approvals,
        required_approvals: action.required_approvals,
      },
      ipAddress: requestIp(c),
    });

    await recordUsage(c.env.DB, tenantId, 'action', 1, {
      action_id: actionId,
      event: 'approved',
    });

    return c.json({ data: action });
  },
);

// ── POST /:id/reject — reject an action ───────────────────────────────
actionsRouter.post(
  '/:id/reject',
  requireAnyScope(['actions:approve', 'actions']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const actionId = c.req.param('id');

    const action = await actionService.rejectAction(
      c.env.DB,
      actionId,
      tenantId,
    );

    await logAudit(c.env.DB, {
      tenantId,
      action: 'action.rejected',
      resourceType: 'action',
      resourceId: actionId,
      actorId: c.get('apiKeyId'),
      ipAddress: requestIp(c),
    });

    return c.json({ data: action });
  },
);

// ── POST /:id/execute — execute an approved action (money moves) ──────
actionsRouter.post(
  '/:id/execute',
  requireAnyScope(['actions:execute', 'actions']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const actionId = c.req.param('id');

    const nearService = nearServiceFactory();

    let action: Awaited<ReturnType<typeof actionService.executeAction>>;
    try {
      action = await actionService.executeAction(
        c.env.DB,
        actionId,
        tenantId,
        nearService,
        {
          correlationId: c.get('requestId'),
          executedBy: c.get('apiKeyId'),
        },
      );
    } catch (err) {
      // M-20: execution failures and ambiguous sends must leave an audit trail,
      // not only a console line. The claim row carries the reconciliation data.
      const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
      if (code === 'EXECUTION_FAILED' || code === 'EXECUTION_UNKNOWN') {
        const claim = await c.env.DB.prepare(
          'SELECT state, tx_hash FROM action_claims WHERE action_id = ? AND tenant_id = ?',
        )
          .bind(actionId, tenantId)
          .first<{ state: string; tx_hash: string | null }>();

        await logAudit(c.env.DB, {
          tenantId,
          action:
            code === 'EXECUTION_FAILED'
              ? 'action.execution_failed'
              : 'action.execution_unknown',
          resourceType: 'action',
          resourceId: actionId,
          actorId: c.get('apiKeyId'),
          details: {
            correlation_id: c.get('requestId'),
            error_code: code,
            claim_state: claim?.state ?? null,
            tx_hash: claim?.tx_hash ?? null,
            message: err instanceof Error ? err.message : 'Unknown execution error',
          },
          ipAddress: requestIp(c),
        });
      }

      throw err;
    }

    await logAudit(c.env.DB, {
      tenantId,
      action: 'action.executed',
      resourceType: 'action',
      resourceId: actionId,
      actorId: c.get('apiKeyId'),
      details: {
        type: action.type,
        execution_result: action.execution_result
          ? safeParse(action.execution_result)
          : null,
      },
      ipAddress: requestIp(c),
    });

    await recordUsage(c.env.DB, tenantId, 'near_transaction', 1, {
      action_id: actionId,
      event: 'executed',
    });

    return c.json({ data: action });
  },
);

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

return actionsRouter;
}
