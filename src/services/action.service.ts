/**
 * Tanat — action service.
 *
 * Core business logic for the action approval and execution system.
 *
 * Security properties enforced here:
 *   - H-01: one action can be executed once. A row in `action_claims` is the
 *     mutex, inserted atomically before any money logic.
 *   - H-02: the reservation is never released after a send may have happened.
 *     Execution state is persisted before and after the transfer.
 *   - H-06: the proposer cannot approve its own action, and high/critical risk
 *     actions need two distinct approvers.
 *   - M-12: execution refuses an expired action.
 *
 * Money rule: the database stores yoctoNEAR as integer strings.
 */

import { generateId } from '../utils/crypto';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { formatYoctoToNear, parseNearToYocto } from '../utils/money';
import { canApprove, canExecute, canReject, isExpired } from './action-state';
import type { NearService, TransferResult } from './near.service';

const MAX_RESERVE_ATTEMPTS = 3;
const STALE_CLAIM_MINUTES = 5;

/** Action types that this Phase 0 executor can actually settle. */
const EXECUTABLE_TYPES = new Set(['near_transfer', 'refund', 'payment']);

const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical']);

export interface CreateActionInput {
  tenant_id: string;
  session_id: string;
  message_id?: string;
  type: string;
  description: string;
  params: Record<string, unknown>;
  risk_level?: string;
  idempotency_key?: string;
  expires_at?: string;
  proposed_by: string;
}

export interface ActionRow {
  id: string;
  session_id: string;
  tenant_id: string;
  message_id: string | null;
  type: string;
  description: string;
  params: string;
  risk_level: string;
  status: string;
  proposed_by: string | null;
  approved_by: string | null;
  second_approved_by: string | null;
  approvals: number;
  required_approvals: number;
  approved_at: string | null;
  executed_at: string | null;
  execution_result: string | null;
  idempotency_key: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface ClaimRow {
  action_id: string;
  tenant_id: string;
  state: 'executing' | 'sending' | 'sent' | 'completed' | 'failed' | 'unknown';
  amount_yocto: string;
  idempotency_key: string;
  reserved: number;
  attempt_token: string;
  tx_hash: string | null;
  last_error: string | null;
  claimed_at: string;
  updated_at: string;
}

function requiredApprovalsForRisk(riskLevel: string): number {
  return riskLevel === 'high' || riskLevel === 'critical' ? 2 : 1;
}

function readAmountYocto(params: Record<string, unknown>): bigint {
  try {
    if (typeof params.amount_yocto === 'string' && params.amount_yocto.length > 0) {
      return BigInt(params.amount_yocto);
    }
    if (params.amount !== undefined) {
      return parseNearToYocto(String(params.amount));
    }
    return 0n;
  } catch {
    throw new ValidationError('Invalid payment amount');
  }
}

function parseParams(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new ValidationError('Action parameters are not valid JSON');
  }
}

/** Parse a JSON object, returning an empty object for malformed input. */
function safeJsonObject(raw: string | null | undefined): Record<string, unknown> {
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

/**
 * Reserve money against the tenant's limit before a payment is sent.
 * Uses compare-and-swap on total_spent_near so two payments cannot both
 * pass the same limit.
 */
async function reserveSpend(
  db: D1Database,
  tenantId: string,
  amountYocto: bigint,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_RESERVE_ATTEMPTS; attempt += 1) {
    const tenant = await db
      .prepare(
        'SELECT spending_limit_near, total_spent_near FROM tenants WHERE id = ? AND status = ?',
      )
      .bind(tenantId, 'active')
      .first<{ spending_limit_near: string; total_spent_near: string }>();

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    const limit = BigInt(tenant.spending_limit_near || '0');
    const spent = BigInt(tenant.total_spent_near || '0');

    if (spent + amountYocto > limit) {
      throw new ValidationError(
        `Spending limit exceeded. Limit: ${formatYoctoToNear(limit)} NEAR, spent: ${formatYoctoToNear(spent)} NEAR, requested: ${formatYoctoToNear(amountYocto)} NEAR`,
      );
    }

    const nextSpent = (spent + amountYocto).toString();
    const result = await db
      .prepare(
        "UPDATE tenants SET total_spent_near = ?, updated_at = datetime('now') WHERE id = ? AND total_spent_near = ?",
      )
      .bind(nextSpent, tenantId, tenant.total_spent_near)
      .run();

    if (result.meta.changes === 1) {
      return;
    }
  }

  throw new ConflictError('Could not reserve the spending limit; please retry');
}

/**
 * Release a reservation when a payment definitively did not happen.
 * Never call this after a transfer may have succeeded.
 */
async function releaseSpend(
  db: D1Database,
  tenantId: string,
  amountYocto: bigint,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_RESERVE_ATTEMPTS; attempt += 1) {
    const tenant = await db
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<{ total_spent_near: string }>();

    if (!tenant) return;

    const spent = BigInt(tenant.total_spent_near || '0');
    const nextSpent = (spent > amountYocto ? spent - amountYocto : 0n).toString();

    const result = await db
      .prepare(
        "UPDATE tenants SET total_spent_near = ?, updated_at = datetime('now') WHERE id = ? AND total_spent_near = ?",
      )
      .bind(nextSpent, tenantId, tenant.total_spent_near)
      .run();

    if (result.meta.changes === 1) return;
  }

  console.error('Failed to release spend reservation', {
    tenantId,
    amountYocto: amountYocto.toString(),
  });
}

function isDefinitiveNearFailure(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { definitive?: unknown }).definitive === true
  );
}

export async function createAction(
  db: D1Database,
  data: CreateActionInput,
): Promise<ActionRow> {
  const idempotencyKey =
    data.idempotency_key?.trim().slice(0, 128) || generateId('idk');

  const existing = await findActionByIdempotencyKey(
    db,
    data.tenant_id,
    idempotencyKey,
  );
  if (existing) return existing;

  const riskLevel = VALID_RISK_LEVELS.has(data.risk_level ?? '')
    ? (data.risk_level as string)
    : 'medium';

  const id = generateId('act');
  const expiresAt = data.expires_at ?? new Date(Date.now() + 3600_000).toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO actions (
           id, session_id, tenant_id, message_id, type, description, params,
           risk_level, status, proposed_by, approvals, required_approvals,
           idempotency_key, expires_at, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .bind(
        id,
        data.session_id,
        data.tenant_id,
        data.message_id ?? null,
        data.type,
        data.description,
        JSON.stringify(data.params),
        riskLevel,
        data.proposed_by,
        requiredApprovalsForRisk(riskLevel),
        idempotencyKey,
        expiresAt,
      )
      .run();
  } catch (err) {
    // A concurrent request may have inserted the same idempotency key first.
    const raced = await findActionByIdempotencyKey(
      db,
      data.tenant_id,
      idempotencyKey,
    );
    if (raced) return raced;
    throw err;
  }

  return getAction(db, id, data.tenant_id);
}

export async function findActionByIdempotencyKey(
  db: D1Database,
  tenantId: string,
  idempotencyKey: string,
): Promise<ActionRow | null> {
  return db
    .prepare('SELECT * FROM actions WHERE tenant_id = ? AND idempotency_key = ?')
    .bind(tenantId, idempotencyKey)
    .first<ActionRow>();
}

export async function getAction(
  db: D1Database,
  id: string,
  tenantId: string,
): Promise<ActionRow> {
  const row = await db
    .prepare('SELECT * FROM actions WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<ActionRow>();

  if (!row) throw new NotFoundError('Action');
  return row;
}

export async function listActions(
  db: D1Database,
  tenantId: string,
  filters: { status?: string; session_id?: string; page?: number; limit?: number } = {},
): Promise<{ actions: ActionRow[]; total: number }> {
  const { status, session_id } = filters;
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(filters.limit ?? 20)));
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE tenant_id = ?';
  const params: unknown[] = [tenantId];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  if (session_id) {
    whereClause += ' AND session_id = ?';
    params.push(session_id);
  }

  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM actions ${whereClause}`)
    .bind(...params)
    .first<{ count: number }>();

  const { results } = await db
    .prepare(
      `SELECT * FROM actions ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all<ActionRow>();

  return { actions: results ?? [], total: countResult?.count ?? 0 };
}

/**
 * Record an approval. Returns the action, which stays `pending` until the
 * required number of distinct approvers is reached.
 */
export async function approveAction(
  db: D1Database,
  id: string,
  tenantId: string,
  approvedBy: string,
): Promise<ActionRow> {
  const action = await getAction(db, id, tenantId);

  if (action.status === 'approved' || action.status === 'executed') return action;

  if (!canApprove(action.status)) {
    throw new ConflictError(`Cannot approve action in "${action.status}" status`);
  }

  if (isExpired(action.expires_at)) {
    await db
      .prepare(
        "UPDATE actions SET status = 'expired', updated_at = datetime('now') WHERE id = ? AND tenant_id = ? AND status = 'pending'",
      )
      .bind(id, tenantId)
      .run();
    throw new ValidationError('Action has expired');
  }

  // H-06: the key that proposed an action cannot approve it.
  if (action.proposed_by && action.proposed_by === approvedBy) {
    throw new ForbiddenError('The proposer cannot approve their own action');
  }

  // Idempotent re-approval by the same key.
  if (
    approvedBy === action.approved_by ||
    approvedBy === action.second_approved_by
  ) {
    return action;
  }

  const current = action.approvals ?? 0;

  const result = await db
    .prepare(
      `UPDATE actions
          SET approvals = approvals + 1,
              approved_by = CASE WHEN approvals = 0 THEN ? ELSE approved_by END,
              second_approved_by = CASE WHEN approvals >= 1 THEN ? ELSE second_approved_by END,
              status = CASE WHEN approvals + 1 >= required_approvals THEN 'approved' ELSE 'pending' END,
              approved_at = CASE WHEN approvals + 1 >= required_approvals THEN datetime('now') ELSE approved_at END,
              updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ? AND status = 'pending' AND approvals = ?`,
    )
    .bind(approvedBy, approvedBy, id, tenantId, current)
    .run();

  if (result.meta.changes !== 1) {
    const latest = await getAction(db, id, tenantId);
    if (latest.status === 'approved' || latest.status === 'executed') {
      return latest;
    }
    throw new ConflictError('Approval state changed; please retry');
  }

  return getAction(db, id, tenantId);
}

export async function rejectAction(
  db: D1Database,
  id: string,
  tenantId: string,
): Promise<ActionRow> {
  const action = await getAction(db, id, tenantId);

  if (action.status === 'rejected') return action;

  if (!canReject(action.status)) {
    throw new ConflictError(`Cannot reject action in "${action.status}" status`);
  }

  await db
    .prepare(
      "UPDATE actions SET status = 'rejected', updated_at = datetime('now') WHERE id = ? AND tenant_id = ? AND status = 'pending'",
    )
    .bind(id, tenantId)
    .run();

  return getAction(db, id, tenantId);
}

async function markActionFailed(
  db: D1Database,
  id: string,
  tenantId: string,
  correlationId: string,
): Promise<void> {
  // A definitive pre-send failure means no money moved. An action that expired
  // while the request was in flight may be recorded as failed as well.
  await db
    .prepare(
      `UPDATE actions
          SET status = 'failed', execution_result = ?, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ? AND status IN ('approved', 'expired')`,
    )
    .bind(JSON.stringify({ error: 'Execution failed', correlation_id: correlationId }), id, tenantId)
    .run();
}

/**
 * Record a send that already happened.
 *
 * The post-send update accepts `expired` because the scheduled sweep or a
 * session close may have expired the action while the transfer was in flight
 * (M-19). The money moved, so the action must be recorded as executed rather
 * than silently dropped. If the status cannot be updated, the claim is moved
 * to `unknown` so it is never retried automatically.
 */
async function recordExecuted(
  db: D1Database,
  id: string,
  tenantId: string,
  result: unknown,
  correlationId: string,
): Promise<ActionRow> {
  const update = await db
    .prepare(
      `UPDATE actions
          SET status = 'executed', executed_at = datetime('now'), execution_result = ?, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ? AND status IN ('approved', 'expired')`,
    )
    .bind(JSON.stringify(result), id, tenantId)
    .run();

  if (update.meta.changes !== 1) {
    const current = await getAction(db, id, tenantId);
    if (current.status === 'executed') return current;

    console.error('[action.execute] send succeeded but action status could not be updated', {
      actionId: id,
      correlationId,
      status: current.status,
    });

    await db
      .prepare(
        `UPDATE action_claims
            SET state = 'unknown', last_error = ?, updated_at = datetime('now')
          WHERE action_id = ? AND tenant_id = ?`,
      )
      .bind(correlationId, id, tenantId)
      .run()
      .catch(() => undefined);

    throw new AppError(
      'Execution state is unknown; reconcile before retrying',
      502,
      'EXECUTION_UNKNOWN',
    );
  }

  await db
    .prepare(
      "UPDATE action_claims SET state = 'completed', updated_at = datetime('now') WHERE action_id = ? AND tenant_id = ?",
    )
    .bind(id, tenantId)
    .run();

  return getAction(db, id, tenantId);
}

async function finalizeSentAction(
  db: D1Database,
  action: ActionRow,
  txHash: string | null,
  correlationId: string,
): Promise<ActionRow> {
  const result: TransferResult | Record<string, unknown> = txHash
    ? { tx_hash: txHash }
    : {};

  return recordExecuted(db, action.id, action.tenant_id, result, correlationId);
}

export interface ExecuteOptions {
  correlationId?: string;
  executedBy?: string;
}

/**
 * Execute an approved action exactly once.
 *
 * The claim row is the mutex. States:
 *   executing → claimed, no send started
 *   sending   → reservation held, send in flight
 *   sent      → send succeeded, action update may still be pending
 *   completed → action recorded as executed
 *   failed    → definitive failure, safe to retry
 *   unknown   → ambiguous state, never retry without reconciliation
 */
export async function executeAction(
  db: D1Database,
  id: string,
  tenantId: string,
  nearService: NearService,
  options: ExecuteOptions = {},
): Promise<ActionRow> {
  const correlationId = options.correlationId ?? crypto.randomUUID();
  const action = await getAction(db, id, tenantId);

  if (action.status === 'executed') return action;

  if (!canExecute(action.status)) {
    throw new ConflictError(`Cannot execute action in "${action.status}" status`);
  }

  if (isExpired(action.expires_at)) {
    await db
      .prepare(
        "UPDATE actions SET status = 'expired', updated_at = datetime('now') WHERE id = ? AND tenant_id = ? AND status = 'approved'",
      )
      .bind(id, tenantId)
      .run();
    throw new ValidationError('Action has expired');
  }

  // L-06: never execute an unknown action type as a transfer.
  if (!EXECUTABLE_TYPES.has(action.type)) {
    throw new ValidationError(`Action type "${action.type}" cannot be executed`);
  }

  // L-02: a paused/removed installation or closed session is a kill switch.
  const scope = await db
    .prepare(
      `SELECT s.status AS session_status, i.status AS installation_status,
              i.config AS installation_config
         FROM sessions s
         JOIN installations i ON i.id = s.installation_id
        WHERE s.id = ? AND s.tenant_id = ?`,
    )
    .bind(action.session_id, tenantId)
    .first<{
      session_status: string;
      installation_status: string;
      installation_config: string;
    }>();

  if (
    !scope ||
    scope.session_status !== 'active' ||
    scope.installation_status !== 'active'
  ) {
    throw new ForbiddenError('Session or installation is not active');
  }

  const params = parseParams(action.params);
  const amountYocto = readAmountYocto(params);

  // M-09: enforce the installation policy again at execution time.
  const installationConfig = safeJsonObject(scope.installation_config);
  const features =
    installationConfig.features &&
    typeof installationConfig.features === 'object' &&
    !Array.isArray(installationConfig.features)
      ? (installationConfig.features as Record<string, unknown>)
      : {};

  if (features.nearPayments === false) {
    throw new ForbiddenError('NEAR payments are disabled for this installation');
  }

  if (typeof installationConfig.maxRefundNear === 'string') {
    let maxRefund: bigint;
    try {
      maxRefund = parseNearToYocto(installationConfig.maxRefundNear);
    } catch {
      throw new ValidationError('Installation payment limit is invalid');
    }

    if (amountYocto > maxRefund) {
      throw new ValidationError(
        `Amount exceeds this installation's limit of ${installationConfig.maxRefundNear} NEAR`,
      );
    }
  }

  const claimKey = `exec_${id}`;
  const initialAttemptToken = crypto.randomUUID();

  // ── 1. Atomic claim (H-01) ─────────────────────────────────────────
  const claimInsert = await db
    .prepare(
      `INSERT INTO action_claims (
         action_id, tenant_id, state, amount_yocto, idempotency_key, reserved,
         attempt_token, claimed_at, updated_at
       )
       VALUES (?, ?, 'executing', ?, ?, 0, ?, datetime('now'), datetime('now'))
       ON CONFLICT (action_id) DO NOTHING`,
    )
    .bind(id, tenantId, amountYocto.toString(), claimKey, initialAttemptToken)
    .run();

  let alreadyReserved = false;
  let attemptToken = initialAttemptToken;

  if (claimInsert.meta.changes !== 1) {
    const claim = await db
      .prepare('SELECT * FROM action_claims WHERE action_id = ? AND tenant_id = ?')
      .bind(id, tenantId)
      .first<ClaimRow>();

    if (!claim) {
      throw new ConflictError('Could not claim this action; please retry');
    }

    if (claim.state === 'completed') {
      return getAction(db, id, tenantId);
    }

    if (claim.state === 'sent') {
      return finalizeSentAction(db, action, claim.tx_hash, correlationId);
    }

    if (claim.state === 'failed') {
      // A definitive failure released the reservation, so the retake owns a
      // fresh reservation. Rotate the token to invalidate the old attempt.
      const newToken = crypto.randomUUID();
      const retake = await db
        .prepare(
          `UPDATE action_claims
              SET state = 'executing', reserved = 0, last_error = NULL,
                  attempt_token = ?, claimed_at = datetime('now'), updated_at = datetime('now')
            WHERE action_id = ? AND tenant_id = ? AND state = 'failed'`,
        )
        .bind(newToken, id, tenantId)
        .run();
      if (retake.meta.changes !== 1) {
        throw new ConflictError('Execution state changed; please retry');
      }
      attemptToken = newToken;
    } else if (claim.state === 'executing') {
      // A crashed attempt that never reached the send step may be retaken
      // after a cooling-off period. If it already reserved, the retake must
      // reuse that reservation instead of reserving twice (M-13).
      const newToken = crypto.randomUUID();
      const retake = await db
        .prepare(
          `UPDATE action_claims
              SET claimed_at = datetime('now'), attempt_token = ?, updated_at = datetime('now')
            WHERE action_id = ? AND tenant_id = ? AND state = 'executing'
              AND datetime(claimed_at) < datetime('now', ?)`,
        )
        .bind(newToken, id, tenantId, `-${STALE_CLAIM_MINUTES} minutes`)
        .run();

      if (retake.meta.changes !== 1) {
        throw new ConflictError(
          'This action is already being executed. Wait for it to finish.',
        );
      }

      alreadyReserved = claim.reserved === 1;
      attemptToken = newToken;
    } else {
      // sending or unknown: money may already have moved.
      throw new AppError(
        'Execution state is unknown; reconcile before retrying',
        409,
        'EXECUTION_UNKNOWN',
      );
    }
  }

  // ── 2. Reserve once (H-01/H-02) ────────────────────────────────────
  let reserved = alreadyReserved;

  if (amountYocto > 0n && !reserved) {
    try {
      await reserveSpend(db, tenantId, amountYocto);
    } catch (err) {
      // No money moved. Release the claim so a corrected action can retry.
      await db
        .prepare(
          "DELETE FROM action_claims WHERE action_id = ? AND tenant_id = ? AND state = 'executing' AND attempt_token = ?",
        )
        .bind(id, tenantId, attemptToken)
        .run();
      throw err;
    }

    // Persist the reservation immediately. A later retake that sees
    // reserved = 1 reuses it instead of reserving the amount a second time.
    const persisted = await db
      .prepare(
        `UPDATE action_claims
            SET reserved = 1, updated_at = datetime('now')
          WHERE action_id = ? AND tenant_id = ? AND state = 'executing' AND attempt_token = ?`,
      )
      .bind(id, tenantId, attemptToken)
      .run();

    if (persisted.meta.changes !== 1) {
      // Another attempt superseded this one after the reservation. Do not send
      // and do not release: the owning attempt holds the reservation state.
      throw new AppError(
        'Execution was superseded by another attempt; reconcile before retrying',
        409,
        'EXECUTION_UNKNOWN',
      );
    }

    reserved = true;
  }

  // ── 3. Persist "sending" before the transfer ───────────────────────
  // The token check is the final guard: a stalled attempt that was retaken
  // can never reach the transfer after another attempt owns the claim.
  const sending = await db
    .prepare(
      `UPDATE action_claims
          SET state = 'sending', reserved = 1, updated_at = datetime('now')
        WHERE action_id = ? AND tenant_id = ? AND state = 'executing' AND attempt_token = ?`,
    )
    .bind(id, tenantId, attemptToken)
    .run();

  if (sending.meta.changes !== 1) {
    // Never send twice and never release here. The other attempt owns the
    // action and will record the outcome.
    throw new AppError(
      'Execution was superseded by another attempt; reconcile before retrying',
      409,
      'EXECUTION_UNKNOWN',
    );
  }

  // ── 4. Send ────────────────────────────────────────────────────────
  let result: TransferResult;

  try {
    result = await nearService.transfer(
      String(params.from_account ?? ''),
      String(params.to_account ?? ''),
      amountYocto,
      { idempotencyKey: claimKey },
    );
  } catch (err) {
    const definitive = isDefinitiveNearFailure(err);
    const internalMessage = err instanceof Error ? err.message : 'Unknown execution error';

    console.error('[action.execute] transfer failed', {
      actionId: id,
      correlationId,
      definitive,
      error: internalMessage,
    });

    if (definitive) {
      // The send provably did not happen. Release the reservation.
      if (reserved) await releaseSpend(db, tenantId, amountYocto);

      await db
        .prepare(
          `UPDATE action_claims
              SET state = 'failed', last_error = ?, updated_at = datetime('now')
            WHERE action_id = ? AND tenant_id = ?`,
        )
        .bind(correlationId, id, tenantId)
        .run()
        .catch(() => undefined);

      await markActionFailed(db, id, tenantId, correlationId);
      throw new AppError('Action execution failed', 502, 'EXECUTION_FAILED');
    }

    // Ambiguous: the send may have happened. Never release the reservation
    // and never mark the action failed.
    await db
      .prepare(
        `UPDATE action_claims
            SET state = 'unknown', last_error = ?, updated_at = datetime('now')
          WHERE action_id = ? AND tenant_id = ?`,
      )
      .bind(correlationId, id, tenantId)
      .run()
      .catch(() => undefined);

    throw new AppError(
      'Execution state is unknown; reconcile before retrying',
      502,
      'EXECUTION_UNKNOWN',
    );
  }

  // ── 5. Record the send before anything else (H-02) ─────────────────
  try {
    const sent = await db
      .prepare(
        `UPDATE action_claims
            SET state = 'sent', tx_hash = ?, updated_at = datetime('now')
          WHERE action_id = ? AND tenant_id = ? AND state = 'sending'`,
      )
      .bind(result.tx_hash, id, tenantId)
      .run();

    if (sent.meta.changes !== 1) {
      throw new Error('claim was not in the sending state');
    }
  } catch (err) {
    console.error('[action.execute] send succeeded but claim persistence failed', {
      actionId: id,
      correlationId,
      txHash: result.tx_hash,
      error: err instanceof Error ? err.message : String(err),
    });
    // Leave the claim in `sending`. It is never retried automatically.
    throw new AppError(
      'Execution state is unknown; reconcile before retrying',
      502,
      'EXECUTION_UNKNOWN',
    );
  }

  // ── 6. Mark the action executed ────────────────────────────────────
  // recordExecuted accepts an action that expired while the send was in
  // flight and moves the claim to `unknown` if it cannot record the outcome.
  return recordExecuted(db, id, tenantId, result, correlationId);
}

export async function getExpiredActions(
  db: D1Database,
  tenantId: string,
): Promise<ActionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM actions
        WHERE tenant_id = ? AND status IN ('pending', 'approved')
          AND NOT EXISTS (
            SELECT 1 FROM action_claims c
             WHERE c.action_id = actions.id
               AND c.state IN ('sending', 'sent', 'unknown')
          )`,
    )
    .bind(tenantId)
    .all<ActionRow>();

  const expired = (results ?? []).filter((row) => isExpired(row.expires_at));

  for (const row of expired) {
    await db
      .prepare(
        `UPDATE actions SET status = 'expired', updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ? AND status IN ('pending', 'approved')
            AND NOT EXISTS (
              SELECT 1 FROM action_claims c
               WHERE c.action_id = actions.id
                 AND c.state IN ('sending', 'sent', 'unknown')
            )`,
      )
      .bind(row.id, tenantId)
      .run();
  }

  return expired;
}

/**
 * Sweep every tenant. Used by the scheduled handler.
 *
 * M-19: an action whose claim is `sending`, `sent`, or `unknown` may already
 * have moved money, so it must never be expired underneath the execution
 * state machine. Those claims are resolved by reconciliation instead.
 */
export async function expireAllActions(db: D1Database): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE actions
          SET status = 'expired', updated_at = datetime('now')
        WHERE status IN ('pending', 'approved')
          AND datetime(expires_at) <= datetime('now')
          AND NOT EXISTS (
            SELECT 1 FROM action_claims c
             WHERE c.action_id = actions.id
               AND c.state IN ('sending', 'sent', 'unknown')
          )`,
    )
    .run();

  return result.meta.changes;
}
