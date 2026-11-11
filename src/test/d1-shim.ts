/**
 * Tanat — in-process D1 test double.
 *
 * Wrangler's local runtime (workerd) does not start on every development
 * machine. This shim runs the real SQL migrations and seed data in SQLite
 * (Node's built-in `node:sqlite`) and exposes the small slice of the D1 API
 * that Tanat uses, so route-level integration tests can run anywhere.
 *
 * It is a test helper, not production code.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Vite does not list `node:sqlite` as a builtin yet, so load it through
// require at runtime. The import is real Node builtin code, not a package.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
type DatabaseSync = InstanceType<typeof DatabaseSync>;

type Row = Record<string, unknown>;

class TestStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): TestStatement {
    return new TestStatement(this.database, this.sql, values);
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.database.prepare(this.sql).get(...(this.params as never[])) as
      | Row
      | undefined;

    if (!row) return null;
    if (column) return (row[column] ?? null) as T | null;
    return row as T;
  }

  async all<T = Row>(): Promise<{
    results: T[];
    success: true;
    meta: Record<string, unknown>;
  }> {
    const results = this.database
      .prepare(this.sql)
      .all(...(this.params as never[])) as T[];
    return { results, success: true, meta: {} };
  }

  async run(): Promise<{
    success: true;
    meta: { changes: number; last_row_id: number };
    results: [];
  }> {
    const info = this.database.prepare(this.sql).run(...(this.params as never[]));
    return {
      success: true,
      meta: {
        changes: Number(info.changes),
        last_row_id: Number(info.lastInsertRowid),
      },
      results: [],
    };
  }
}

class TestD1 {
  readonly database = new DatabaseSync(':memory:');

  prepare(sql: string): TestStatement {
    return new TestStatement(this.database, sql);
  }

  async exec(sql: string): Promise<{ count: number; duration: number }> {
    this.database.exec(sql);
    return { count: 0, duration: 0 };
  }

  async batch(statements: TestStatement[]): Promise<unknown[]> {
    return Promise.all(statements.map((statement) => statement.run()));
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }
}

/**
 * Create an in-memory database with the full schema and seed data applied.
 */
export function createTestDatabase(): {
  d1: D1Database;
  raw: DatabaseSync;
} {
  const d1 = new TestD1();

  const migrations = [
    readFileSync(new URL('../db/migrations/0001_init.sql', import.meta.url), 'utf8'),
    readFileSync(new URL('../db/migrations/0002_phase0.sql', import.meta.url), 'utf8'),
    readFileSync(new URL('../db/migrations/0003_security.sql', import.meta.url), 'utf8'),
    readFileSync(new URL('../db/migrations/0004_dashboard_auth.sql', import.meta.url), 'utf8'),
    readFileSync(new URL('../db/migrations/0005_email_otp.sql', import.meta.url), 'utf8'),
    readFileSync(new URL('../db/migrations/0006_payment_intents.sql', import.meta.url), 'utf8'),
    readFileSync(new URL('../db/migrations/0007_channels_and_publishable_keys.sql', import.meta.url), 'utf8'),
  ];

  for (const migration of migrations) {
    d1.database.exec(migration);
  }

  d1.database.exec(
    readFileSync(new URL('../../scripts/seed.sql', import.meta.url), 'utf8'),
  );

  return { d1: d1 as unknown as D1Database, raw: d1.database };
}
