/**
 * Tanat — tenant service.
 *
 * Data access layer for tenant CRUD operations.
 *
 * Money rule: spending_limit_near and total_spent_near are stored as
 * yoctoNEAR integer strings. Inputs and outputs use NEAR decimal values.
 */

import { generateId } from '../utils/crypto';
import { NotFoundError, ConflictError } from '../utils/errors';
import { parseNearToYocto } from '../utils/money';

export interface CreateTenantInput {
  name: string;
  slug: string;
  near_account_id?: string;
  spending_limit_near?: string;
}

export interface UpdateTenantInput {
  name?: string;
  near_account_id?: string;
  spending_limit_near?: string;
  status?: string;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: string;
  near_account_id: string | null;
  spending_limit_near: string;
  total_spent_near: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SPENDING_LIMIT_NEAR = '100';

export async function createTenant(
  db: D1Database,
  data: CreateTenantInput,
): Promise<TenantRow> {
  const id = generateId('ten');

  const existing = await db
    .prepare('SELECT id FROM tenants WHERE slug = ? AND status != ?')
    .bind(data.slug, 'deleted')
    .first();

  if (existing) {
    throw new ConflictError(`Tenant with slug "${data.slug}" already exists`);
  }

  const spendingLimit = parseNearToYocto(
    data.spending_limit_near ?? DEFAULT_SPENDING_LIMIT_NEAR,
  ).toString();

  await db
    .prepare(
      `INSERT INTO tenants (id, name, slug, status, settings, near_account_id, spending_limit_near, total_spent_near, created_at, updated_at)
       VALUES (?, ?, ?, 'active', '{}', ?, ?, '0', datetime('now'), datetime('now'))`,
    )
    .bind(
      id,
      data.name,
      data.slug,
      data.near_account_id ?? null,
      spendingLimit,
    )
    .run();

  return getTenant(db, id);
}

export async function getTenant(db: D1Database, id: string): Promise<TenantRow> {
  const row = await db
    .prepare('SELECT * FROM tenants WHERE id = ? AND status != ?')
    .bind(id, 'deleted')
    .first<TenantRow>();

  if (!row) {
    throw new NotFoundError('Tenant');
  }

  return row;
}

export async function updateTenant(
  db: D1Database,
  id: string,
  data: UpdateTenantInput,
): Promise<TenantRow> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    values.push(data.name);
  }
  if (data.near_account_id !== undefined) {
    sets.push('near_account_id = ?');
    values.push(data.near_account_id);
  }
  if (data.spending_limit_near !== undefined) {
    sets.push('spending_limit_near = ?');
    values.push(parseNearToYocto(data.spending_limit_near).toString());
  }
  if (data.status !== undefined) {
    sets.push('status = ?');
    values.push(data.status);
  }

  if (sets.length === 0) {
    return getTenant(db, id);
  }

  sets.push("updated_at = datetime('now')");
  values.push(id);

  await db
    .prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getTenant(db, id);
}

export async function deleteTenant(db: D1Database, id: string): Promise<void> {
  const result = await db
    .prepare(
      "UPDATE tenants SET status = 'deleted', updated_at = datetime('now') WHERE id = ? AND status != 'deleted'",
    )
    .bind(id)
    .run();

  if (!result.meta.changes) {
    throw new NotFoundError('Tenant');
  }
}
