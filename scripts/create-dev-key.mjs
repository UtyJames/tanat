#!/usr/bin/env node
/**
 * Tanat — create a tenant API key without committing it to the repository.
 *
 * Generates a random `tnt_` key, hashes it with API_KEY_SALT, and either
 * inserts it into a local SQLite database or prints the SQL for remote use.
 *
 * Usage:
 *   node scripts/create-dev-key.mjs --tenant tnt_acme_000001 \
 *     --name "Local admin" --scopes '["*"]'
 *
 * Options:
 *   --tenant <id>     Tenant ID (required)
 *   --name <label>    Human label for the key (default: "Development key")
 *   --scopes <json>   JSON array of scopes (default: ["*"])
 *   --db <path>       Local SQLite file. Omit to print SQL instead.
 *   --expires <iso>   Optional ISO-8601 expiry, must be in the future.
 *
 * The plaintext key is printed once. Store it in your password manager; it is
 * never written to disk by this script.
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function loadSalt() {
  if (process.env.API_KEY_SALT) return process.env.API_KEY_SALT;

  if (!existsSync('.dev.vars')) {
    throw new Error(
      'API_KEY_SALT is not set and .dev.vars is missing. Set API_KEY_SALT explicitly.',
    );
  }

  for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    if (trimmed.slice(0, index).trim() === 'API_KEY_SALT') {
      return trimmed.slice(index + 1).trim();
    }
  }

  throw new Error('API_KEY_SALT was not found in .dev.vars.');
}

function randomId(prefix) {
  return `${prefix}_${randomBytes(16).toString('hex')}`;
}

const args = parseArgs(process.argv.slice(2));

if (!args.tenant) {
  console.error('Missing --tenant <id>.');
  process.exit(1);
}

const tenantId = String(args.tenant);
const name = String(args.name ?? 'Development key');
let scopes;
try {
  scopes = JSON.parse(String(args.scopes ?? '["*"]'));
} catch {
  console.error('--scopes must be a JSON array, for example \'["read","write"]\'.');
  process.exit(1);
}

if (!Array.isArray(scopes) || scopes.length === 0) {
  console.error('--scopes must be a non-empty JSON array.');
  process.exit(1);
}

if (args.expires && Date.parse(String(args.expires)) <= Date.now()) {
  console.error('--expires must be in the future.');
  process.exit(1);
}

const salt = loadSalt();
const key = `tnt_${randomBytes(32).toString('hex')}`;
const prefix = key.slice(0, 12);
const hash = createHash('sha256').update(`${salt}:${key}`).digest('hex');
const id = randomId('key');

const sql = `INSERT INTO api_keys (id, tenant_id, key_hash, key_prefix, name, scopes, expires_at, is_active, created_at, updated_at)
VALUES ('${id}', '${tenantId}', '${hash}', '${prefix}', '${name.replace(/'/g, "''")}', '${JSON.stringify(scopes).replace(/'/g, "''")}', ${args.expires ? `'${args.expires}'` : 'NULL'}, 1, datetime('now'), datetime('now'));`;

if (args.db) {
  const database = new DatabaseSync(String(args.db));
  const tenant = database
    .prepare('SELECT id FROM tenants WHERE id = ?')
    .get(tenantId);

  if (!tenant) {
    console.error(`Tenant ${tenantId} does not exist in ${args.db}.`);
    process.exit(1);
  }

  database.prepare(sql).run();
  console.log(`Created key ${id} for tenant ${tenantId} in ${args.db}.`);
} else {
  console.log('-- Run this SQL against D1:');
  console.log(sql);
}

console.log('');
console.log('Plaintext API key (shown once):');
console.log(key);
console.log('');
console.log('Use it as: Authorization: Bearer <key>');
