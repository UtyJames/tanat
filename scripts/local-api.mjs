#!/usr/bin/env node
/**
 * Tanat — local API runner without workerd.
 *
 * Wrangler's local runtime does not start on every Windows machine. This
 * script runs the real bundled Worker (`dist/index.js`) inside Node, backed
 * by SQLite through `node:sqlite`. It applies the real migrations and seed
 * data, so the API behaves like the deployed Worker.
 *
 * Usage:
 *   npm run build:worker
 *   node scripts/local-api.mjs
 *
 * Optional:
 *   PORT=8787
 *   TANAT_DB_PATH=.wrangler/local.sqlite   (persist data between runs)
 */

import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import worker from '../dist/index.js';

const PORT = Number(process.env.PORT ?? '8787');
const DB_PATH = process.env.TANAT_DB_PATH ?? '.wrangler/local.sqlite';

// ── D1-compatible shim ────────────────────────────────────────────────
class Statement {
  constructor(database, sql, params = []) {
    this.database = database;
    this.sql = sql;
    this.params = params;
  }

  bind(...values) {
    return new Statement(this.database, this.sql, values);
  }

  async first(column) {
    const row = this.database.prepare(this.sql).get(...this.params);
    if (!row) return null;
    if (column) return row[column] ?? null;
    return row;
  }

  async all() {
    const results = this.database.prepare(this.sql).all(...this.params);
    return { results, success: true, meta: {} };
  }

  async run() {
    const info = this.database.prepare(this.sql).run(...this.params);
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

class D1 {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new Statement(this.database, sql);
  }

  async exec(sql) {
    this.database.exec(sql);
    return { count: 0, duration: 0 };
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }

  async dump() {
    return new ArrayBuffer(0);
  }
}

// ── Database setup ────────────────────────────────────────────────────
function loadDatabase() {
  if (DB_PATH !== ':memory:') {
    mkdirSync(dirname(resolve(DB_PATH)), { recursive: true });
  }

  const database = new DatabaseSync(DB_PATH);
  const alreadyInitialised = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tenants'")
    .get();

  if (!alreadyInitialised) {
    // Apply every migration in order so new tables (auth, payments, ...) exist.
    const migrationsDir = 'src/db/migrations';
    for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
      database.exec(readFileSync(`${migrationsDir}/${file}`, 'utf8'));
    }
    database.exec(readFileSync('scripts/seed.sql', 'utf8'));
    console.log('Database initialised with schema and seed data.');
  } else {
    // Ensure additive platform tables from 0007 exist on already-initialised DBs.
    database.exec(readFileSync('src/db/migrations/0007_channels_and_publishable_keys.sql', 'utf8'));
  }

  return database;
}

// ── Environment ───────────────────────────────────────────────────────
function loadDevVars() {
  const values = {};
  try {
    const text = readFileSync('.dev.vars', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;
      values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    }
  } catch {
    console.warn('.dev.vars not found; using defaults.');
  }
  return values;
}

const database = loadDatabase();
const devVars = loadDevVars();

const env = {
  DB: new D1(database),
  ENVIRONMENT: 'development',
  API_VERSION: 'v1',
  RATE_LIMIT_REQUESTS: '100',
  RATE_LIMIT_WINDOW_SECONDS: '60',
  // wrangler.toml [vars] are not loaded here; mirror the auth defaults.
  AUTH_APP_URL: 'http://localhost:3000',
  AUTH_EMAIL_FROM: 'Tanat <hello@tanat.space>',
  MASTER_API_KEY: devVars.MASTER_API_KEY ?? randomHex(32),
  API_KEY_SALT: devVars.API_KEY_SALT ?? randomHex(32),
  ...devVars,
};

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// ── HTTP bridge ───────────────────────────────────────────────────────
const server = createServer(async (incoming, outgoing) => {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(',') : value);
    }
  }

  const request = new Request(`http://localhost:${PORT}${incoming.url ?? '/'}`, {
    method: incoming.method ?? 'GET',
    headers,
    body,
  });

  const context = {
    waitUntil(promise) {
      Promise.resolve(promise).catch(() => undefined);
    },
    passThroughOnException() {
      // No-op outside Workers.
    },
  };

  try {
    const response = await worker.fetch(request, env, context);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Local API error:', error);
    outgoing.statusCode = 500;
    outgoing.setHeader('Content-Type', 'application/json');
    outgoing.end(
      JSON.stringify({
        error: {
          code: 'LOCAL_SERVER_ERROR',
          message: 'The local API runner hit an unexpected error.',
        },
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log(`Tanat local API listening on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
