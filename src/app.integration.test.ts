/**
 * Tanat — end-to-end API tests.
 *
 * These tests run the real Hono app against the real SQL schema and seed data,
 * using an in-memory SQLite D1 shim. Every credential is generated at runtime;
 * no demo key or demo secret is committed to the repository.
 *
 * The suite covers authentication, tenant isolation, scopes, the approval
 * gate, money accounting, the operator boundary, and the security-review
 * regressions (H-01, H-02, H-03, H-06, M-01..M-03, M-09..M-11, L-01, L-09).
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import type { Env } from './types';
import { createTestDatabase } from './test/d1-shim';
import { generateApiKey, hashApiKey } from './utils/crypto';
import * as actionService from './services/action.service';
import { NearService, NearTransferError } from './services/near.service';
import type { DatabaseSync } from 'node:sqlite';

const MASTER_KEY = `op_${crypto.randomUUID().replace(/-/g, '')}`;
const SALT = crypto.randomUUID();
const app = createApp(() => new NearService(true));

let env: Env;
let raw: DatabaseSync;

// Runtime-generated credentials. The plaintext values live only in memory.
let acmeKey = '';
let starkKey = '';
let readOnlyKey = '';
let approverOneKey = '';
let approverTwoKey = '';
let executorKey = '';
let expiredKey = '';
let chatOnlyKey = '';

let sessionId = '';
let actionId = '';
let largeActionId = '';
let highRiskActionId = '';
let concurrentActionId = '';

interface ApiResult {
  status: number;
  json: any;
  headers: Headers;
}

async function api(
  path: string,
  options: {
    method?: string;
    key?: string | null;
    body?: unknown;
    rawBody?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResult> {
  const { method = 'GET', key = acmeKey, body, rawBody, headers = {} } = options;

  const requestHeaders: Record<string, string> = { ...headers };
  if (key) requestHeaders.Authorization = `Bearer ${key}`;
  if (body !== undefined || rawBody !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await app.request(
    path,
    {
      method,
      headers: requestHeaders,
      body:
        rawBody !== undefined
          ? rawBody
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    },
    env,
  );

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    // Some responses may not be JSON.
  }

  return { status: response.status, json, headers: response.headers };
}

async function insertKey(
  database: ReturnType<typeof createTestDatabase>['d1'],
  id: string,
  tenantId: string,
  key: string,
  scopes: string[],
  expiresAt: string | null = null,
): Promise<void> {
  const hash = await hashApiKey(key, SALT);
  await database
    .prepare(
      `INSERT INTO api_keys (id, tenant_id, key_hash, key_prefix, name, scopes, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .bind(id, tenantId, hash, key.slice(0, 12), id, JSON.stringify(scopes), expiresAt)
    .run();
}

beforeAll(async () => {
  const database = createTestDatabase();
  raw = database.raw;

  env = {
    DB: database.d1,
    ENVIRONMENT: 'test',
    API_VERSION: 'v1',
    RATE_LIMIT_REQUESTS: '1000',
    RATE_LIMIT_WINDOW_SECONDS: '60',
    PREAUTH_RATE_LIMIT_REQUESTS: '1000',
    MASTER_API_KEY: MASTER_KEY,
    NEAR_NETWORK: 'testnet',
    NEAR_RPC_URL: 'https://rpc.testnet.near.org',
    API_KEY_SALT: SALT,
    CORS_ORIGINS: 'http://localhost:3000',
    RESEND_API_KEY: 're_test_key',
    AUTH_EMAIL_FROM: 'Tanat <auth@example.test>',
    AUTH_APP_URL: 'https://tanat-web.pages.dev',
  };

  acmeKey = generateApiKey().key;
  starkKey = generateApiKey().key;
  readOnlyKey = generateApiKey().key;
  approverOneKey = generateApiKey().key;
  approverTwoKey = generateApiKey().key;
  executorKey = generateApiKey().key;
  expiredKey = generateApiKey().key;
  chatOnlyKey = generateApiKey().key;

  await insertKey(database.d1, 'key_acme_admin', 'tnt_acme_000001', acmeKey, ['*']);
  await insertKey(database.d1, 'key_stark_admin', 'tnt_stark_00001', starkKey, ['*']);
  await insertKey(database.d1, 'key_read_only', 'tnt_acme_000001', readOnlyKey, ['read']);
  await insertKey(database.d1, 'key_approver_1', 'tnt_acme_000001', approverOneKey, [
    'actions:read',
    'actions:approve',
  ]);
  await insertKey(database.d1, 'key_approver_2', 'tnt_acme_000001', approverTwoKey, [
    'actions:read',
    'actions:approve',
  ]);
  await insertKey(database.d1, 'key_executor', 'tnt_acme_000001', executorKey, [
    'actions:read',
    'actions:execute',
  ]);
  await insertKey(database.d1, 'key_chat_only', 'tnt_acme_000001', chatOnlyKey, [
    'sessions',
  ]);
  await insertKey(
    database.d1,
    'key_expired',
    'tnt_acme_000001',
    expiredKey,
    ['read'],
    new Date(Date.now() - 60_000).toISOString(),
  );
});

describe('public endpoints', () => {
  it('reports health without authentication', async () => {
    const result = await api('/health', { key: null });
    expect(result.status).toBe(200);
    expect(result.json.status).toBe('ok');
  });

  describe('email signup and dashboard sessions', () => {
    it('provisions a tenant and starter agent only after OTP verification', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email_test_id' }), { status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);
      try {
        const email = `owner-${crypto.randomUUID()}@example.test`;
        const start = await app.request(
          '/api/auth/otp/request',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tenant_name: 'Example Shop' }),
          },
          env,
        );
        expect(start.status).toBe(202);
        expect(fetchMock).toHaveBeenCalledOnce();

        const emailRequest = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        const codeMatch = emailRequest.text.match(/code is (\d{6})/);
        expect(codeMatch).not.toBeNull();
        const code = codeMatch[1];

        const beforeVerification = raw
          .prepare('SELECT COUNT(*) AS count FROM tenants')
          .get() as { count: number };
        expect(beforeVerification.count).toBe(2);

        const verify = await app.request(
          '/api/auth/otp/verify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
          },
          env,
        );
        expect(verify.status).toBe(200);
        const verified = await verify.json() as {
          data: { token: string; tenant: { id: string; name: string } };
        };
        expect(verified.data.tenant.name).toBe('Example Shop');

        const tenantResponse = await api('/api/v1/tenants', {
          key: verified.data.token,
        });
        expect(tenantResponse.status).toBe(200);
        expect(tenantResponse.json.data.name).toBe('Example Shop');

        const agents = await api('/api/v1/agents', { key: verified.data.token });
        expect(agents.status).toBe(200);
        expect(agents.json.data).toHaveLength(1);

        const keyResponse = await api('/api/v1/keys', {
          method: 'POST',
          key: verified.data.token,
          body: { name: 'Store integration', scopes: ['read', 'sessions'] },
        });
        expect(keyResponse.status).toBe(201);
        expect(keyResponse.json.data.key).toMatch(/^tnt_[0-9a-f]{64}$/);

        const replay = await app.request(
          '/api/auth/otp/verify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
          },
          env,
        );
        expect(replay.status).toBe(401);

        const logout = await app.request(
          '/api/auth/logout',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${verified.data.token}` },
          },
          env,
        );
        expect(logout.status).toBe(200);
        const afterLogout = await api('/api/v1/tenants', {
          key: verified.data.token,
        });
        expect(afterLogout.status).toBe(401);

        const loginAgain = await app.request(
          '/api/auth/otp/request',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tenant_name: 'Ignored on existing account' }),
          },
          env,
        );
        expect(loginAgain.status).toBe(202);
        const secondEmail = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
        const secondCodeMatch = secondEmail.text.match(/code is (\d{6})/);
        const secondCode = secondCodeMatch[1];
        const secondVerify = await app.request(
          '/api/auth/otp/verify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code: secondCode }),
          },
          env,
        );
        const secondSession = await secondVerify.json() as {
          data: { tenant: { name: string; id: string } };
        };
        expect(secondSession.data.tenant).toMatchObject({
          name: 'Example Shop',
          id: verified.data.tenant.id,
        });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('limits incorrect OTP attempts and does not allow reuse', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email_test_id' }), { status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);
      try {
        const email = `otp-${crypto.randomUUID()}@example.test`;
        const request = await app.request(
          '/api/auth/otp/request',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tenant_name: 'OTP Test Shop' }),
          },
          env,
        );
        expect(request.status).toBe(202);
        const emailRequest = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        const issuedCode = emailRequest.text.match(/code is (\d{6})/)[1];
        const incorrectCode = issuedCode === '000000' ? '000001' : '000000';

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const invalid = await app.request(
            '/api/auth/otp/verify',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, code: incorrectCode }),
            },
            env,
          );
          expect(invalid.status).toBe(401);
        }

        const locked = await app.request(
          '/api/auth/otp/verify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code: issuedCode }),
          },
          env,
        );
        expect(locked.status).toBe(401);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  it('sends security headers', async () => {
    const result = await api('/health', { key: null });
    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
});

describe('authentication', () => {
  it('rejects a request with no credentials', async () => {
    const result = await api('/api/v1/tenants', { key: null });
    expect(result.status).toBe(401);
    expect(result.json.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects the legacy X-API-Key header', async () => {
    const result = await api('/api/v1/tenants', {
      key: null,
      headers: { 'X-API-Key': acmeKey },
    });
    expect(result.status).toBe(401);
  });

  it('rejects an invalid key', async () => {
    const result = await api('/api/v1/tenants', { key: 'tnt_not_a_real_key' });
    expect(result.status).toBe(401);
  });

  it('rejects an expired key (M-01)', async () => {
    const result = await api('/api/v1/tenants', { key: expiredKey });
    expect(result.status).toBe(401);
  });

  it('accepts a generated key and resolves the tenant', async () => {
    const result = await api('/api/v1/tenants');
    expect(result.status).toBe(200);
    expect(result.json.data.id).toBe('tnt_acme_000001');
  });
});

describe('money formatting at the API boundary', () => {
  it('returns spending limits as NEAR decimals', async () => {
    const result = await api('/api/v1/tenants');
    expect(result.json.data.spending_limit_near).toBe('50');
    expect(result.json.data.total_spent_near).toBe('0');
  });

  it('stores the limit as yoctoNEAR in the database', () => {
    const row = raw
      .prepare('SELECT spending_limit_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { spending_limit_near: string };
    expect(row.spending_limit_near).toBe('50000000000000000000000000');
  });
});

describe('tenant isolation', () => {
  it('refuses to read another tenant by id', async () => {
    const result = await api('/api/v1/tenants/tnt_stark_00001');
    expect(result.status).toBe(403);
  });

  it('lists only the authenticated tenant agents', async () => {
    const result = await api('/api/v1/agents');
    expect(result.status).toBe(200);
    expect(result.json.meta.total).toBe(1);
    expect(result.json.data[0].id).toBe('agt_acme_support');
  });

  it('lists only the authenticated tenant installations', async () => {
    const result = await api('/api/v1/installations');
    expect(result.status).toBe(200);
    expect(result.json.meta.total).toBe(1);
    expect(result.json.data[0].id).toBe('inst_acme_cs_001');
  });
});

describe('scopes', () => {
  it('allows a read-only key to read agents', async () => {
    const result = await api('/api/v1/agents', { key: readOnlyKey });
    expect(result.status).toBe(200);
  });

  it('blocks a read-only key from creating an agent', async () => {
    const result = await api('/api/v1/agents', {
      key: readOnlyKey,
      method: 'POST',
      body: { name: 'Nope', slug: 'nope', system_prompt: 'Nope' },
    });
    expect(result.status).toBe(403);
    expect(result.json.error.code).toBe('FORBIDDEN');
  });

  it('blocks a read-only key from opening sessions', async () => {
    const result = await api('/api/v1/sessions', {
      key: readOnlyKey,
      method: 'POST',
      body: { installation_id: 'inst_acme_cs_001' },
    });
    expect(result.status).toBe(403);
  });
});

describe('NEAR Intents quote previews', () => {
  it('requires a payment-proposal scope and only requests a dry quote', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ quoteId: 'quote_test' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const request = {
        purpose: 'checkout',
        origin_asset: 'nep141:wrap.near',
        destination_asset: 'nep141:usdt.tether-token.near',
        amount: '1000000',
        recipient: 'merchant.near',
        recipient_type: 'INTENTS',
        refund_to: 'shopper.near',
        refund_type: 'ORIGIN_CHAIN',
      };
      const denied = await api('/api/v1/near/intents/quote', {
        method: 'POST',
        key: readOnlyKey,
        body: request,
      });
      expect(denied.status).toBe(403);

      const result = await api('/api/v1/near/intents/quote', {
        method: 'POST',
        body: request,
      });
      expect(result.status).toBe(200);
      expect(result.json.data).toMatchObject({
        purpose: 'checkout',
        dry: true,
        quote: { quoteId: 'quote_test' },
      });
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).dry).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('tenant money controls (H-03)', () => {
  it('rejects a tenant trying to raise its own spending limit', async () => {
    const result = await api('/api/v1/tenants/tnt_acme_000001', {
      method: 'PATCH',
      body: { spending_limit_near: '999999' },
    });
    expect(result.status).toBe(400);

    const row = raw
      .prepare('SELECT spending_limit_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { spending_limit_near: string };
    expect(row.spending_limit_near).toBe('50000000000000000000000000');
  });

  it('allows a tenant to rename itself', async () => {
    const result = await api('/api/v1/tenants/tnt_acme_000001', {
      method: 'PATCH',
      body: { name: 'Acme Corporation' },
    });
    expect(result.status).toBe(200);
    expect(result.json.data.name).toBe('Acme Corporation');
  });
});

describe('chat and approval flow', () => {
  it('creates a session', async () => {
    const result = await api('/api/v1/sessions', {
      method: 'POST',
      body: { installation_id: 'inst_acme_cs_001', user_id: 'test-user' },
    });
    expect(result.status).toBe(201);
    sessionId = result.json.data.id;
    expect(sessionId).toMatch(/^sess_/);
  });

  it('answers a normal message', async () => {
    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Hello there' },
    });
    expect(result.status).toBe(200);
    expect(typeof result.json.data.content).toBe('string');
    expect(result.json.data.proposed_action).toBeNull();
  });

  it('does not treat a dollar amount as NEAR (M-10)', async () => {
    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please refund $240 to alice.near' },
    });
    expect(result.status).toBe(200);
    expect(result.json.data.proposed_action).toBeNull();
    expect(result.json.data.content).toContain('US dollars');
  });

  it('proposes a pending action for a money request', async () => {
    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please refund 5 NEAR to alice.near' },
    });

    expect(result.status).toBe(200);
    const action = result.json.data.proposed_action;
    expect(action.status).toBe('pending');
    expect(action.required_approvals).toBe(1);
    actionId = action.id;

    const row = raw
      .prepare('SELECT params FROM actions WHERE id = ?')
      .get(actionId) as { params: string };
    const params = JSON.parse(row.params);
    expect(params.amount).toBe('5');
    expect(params.amount_yocto).toBe('5000000000000000000000000');
  });

  it('replays the proposal for a repeated idempotency key (M-03)', async () => {
    const first = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please refund 1 NEAR to alice.near' },
      headers: { 'Idempotency-Key': 'retry-test-1' },
    });
    const second = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please refund 1 NEAR to alice.near' },
      headers: { 'Idempotency-Key': 'retry-test-1' },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.json.data.idempotent_replay).toBe(true);
    expect(second.json.data.proposed_action.id).toBe(
      first.json.data.proposed_action.id,
    );
  });

  it('refuses to execute before approval', async () => {
    const result = await api(`/api/v1/actions/${actionId}/execute`, {
      method: 'POST',
      key: executorKey,
    });
    expect(result.status).toBe(409);
  });

  it('hides the action from another tenant', async () => {
    const result = await api(`/api/v1/actions/${actionId}`, { key: starkKey });
    expect(result.status).toBe(404);
  });

  it('hides the session from another tenant', async () => {
    const result = await api(`/api/v1/sessions/${sessionId}`, { key: starkKey });
    expect(result.status).toBe(404);
  });

  it('refuses to let the proposer approve its own action (H-06)', async () => {
    const result = await api(`/api/v1/actions/${actionId}/approve`, {
      method: 'POST',
      key: acmeKey,
    });
    expect(result.status).toBe(403);
  });

  it('approves the action with a different credential', async () => {
    const result = await api(`/api/v1/actions/${actionId}/approve`, {
      method: 'POST',
      key: approverOneKey,
    });
    expect(result.status).toBe(200);
    expect(result.json.data.status).toBe('approved');
  });

  it('refuses to reject an approved action', async () => {
    const result = await api(`/api/v1/actions/${actionId}/reject`, {
      method: 'POST',
      key: approverTwoKey,
    });
    expect(result.status).toBe(409);
  });

  it('executes the approved action', async () => {
    const result = await api(`/api/v1/actions/${actionId}/execute`, {
      method: 'POST',
      key: executorKey,
    });
    expect(result.status).toBe(200);
    expect(result.json.data.status).toBe('executed');
  });

  it('records the spend as yoctoNEAR and returns NEAR', async () => {
    const dbRow = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };
    expect(dbRow.total_spent_near).toBe('5000000000000000000000000');

    const result = await api('/api/v1/tenants');
    expect(result.json.data.total_spent_near).toBe('5');
  });

  it('is idempotent on repeated execution', async () => {
    const first = await api(`/api/v1/actions/${actionId}/execute`, {
      method: 'POST',
      key: executorKey,
    });
    const second = await api(`/api/v1/actions/${actionId}/execute`, {
      method: 'POST',
      key: executorKey,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.json.data.status).toBe('executed');

    const dbRow = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };
    expect(dbRow.total_spent_near).toBe('5000000000000000000000000');
  });
});

describe('high-risk actions need two distinct approvers (H-06)', () => {
  it('proposes a high-risk refund', async () => {
    raw
      .prepare('UPDATE installations SET config = ? WHERE id = ?')
      .run(
        JSON.stringify({ maxRefundNear: '50' }),
        'inst_acme_cs_001',
      );

    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please refund 25 NEAR to carol.near' },
    });

    expect(result.status).toBe(200);
    const action = result.json.data.proposed_action;
    expect(action.risk_level).toBe('high');
    expect(action.required_approvals).toBe(2);
    highRiskActionId = action.id;
  });

  it('stays pending after one approval', async () => {
    const result = await api(`/api/v1/actions/${highRiskActionId}/approve`, {
      method: 'POST',
      key: approverOneKey,
    });
    expect(result.status).toBe(200);
    expect(result.json.data.status).toBe('pending');
    expect(result.json.data.approvals).toBe(1);
  });

  it('does not count the same approver twice', async () => {
    const result = await api(`/api/v1/actions/${highRiskActionId}/approve`, {
      method: 'POST',
      key: approverOneKey,
    });
    expect(result.status).toBe(200);
    expect(result.json.data.status).toBe('pending');
    expect(result.json.data.approvals).toBe(1);
  });

  it('approves after a second distinct approver', async () => {
    const result = await api(`/api/v1/actions/${highRiskActionId}/approve`, {
      method: 'POST',
      key: approverTwoKey,
    });
    expect(result.status).toBe(200);
    expect(result.json.data.status).toBe('approved');
    expect(result.json.data.approvals).toBe(2);
  });
});

describe('atomic execution (H-01)', () => {
  it('proposes a low-risk transfer', async () => {
    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please transfer 1 NEAR to dave.near' },
    });
    expect(result.status).toBe(200);
    concurrentActionId = result.json.data.proposed_action.id;
  });

  it('approves it', async () => {
    const result = await api(`/api/v1/actions/${concurrentActionId}/approve`, {
      method: 'POST',
      key: approverOneKey,
    });
    expect(result.status).toBe(200);
    expect(result.json.data.status).toBe('approved');
  });

  it('executes exactly once under concurrent requests', async () => {
    const before = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };

    const results = await Promise.all([
      api(`/api/v1/actions/${concurrentActionId}/execute`, {
        method: 'POST',
        key: executorKey,
      }),
      api(`/api/v1/actions/${concurrentActionId}/execute`, {
        method: 'POST',
        key: executorKey,
      }),
      api(`/api/v1/actions/${concurrentActionId}/execute`, {
        method: 'POST',
        key: executorKey,
      }),
    ]);

    // Every request must either succeed or report a conflict; none may 500.
    for (const result of results) {
      expect([200, 409]).toContain(result.status);
    }
    expect(results.some((result) => result.status === 200)).toBe(true);

    const after = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };

    const spent = BigInt(after.total_spent_near) - BigInt(before.total_spent_near);
    expect(spent).toBe(1_000_000_000_000_000_000_000_000n);

    const claims = raw
      .prepare('SELECT COUNT(*) AS count FROM action_claims WHERE action_id = ?')
      .get(concurrentActionId) as { count: number };
    expect(claims.count).toBe(1);
  });
});

describe('ambiguous send failures (H-02)', () => {
  it('keeps the reservation and marks the claim unknown', async () => {
    const sessionResult = await api('/api/v1/sessions', {
      method: 'POST',
      body: { installation_id: 'inst_acme_cs_001' },
    });
    expect(sessionResult.status).toBe(201);
    const ambiguousSessionId = sessionResult.json.data.id;

    const action = await actionService.createAction(env.DB, {
      tenant_id: 'tnt_acme_000001',
      session_id: ambiguousSessionId,
      type: 'near_transfer',
      description: 'Ambiguous transfer',
      params: {
        from_account: 'acme-corp.testnet',
        to_account: 'erin.near',
        amount: '2',
        amount_yocto: '2000000000000000000000000',
      },
      risk_level: 'medium',
      idempotency_key: `ambiguous-${crypto.randomUUID()}`,
      proposed_by: 'key_acme_admin',
    });

    await actionService.approveAction(
      env.DB,
      action.id,
      'tnt_acme_000001',
      'key_approver_1',
    );

    const before = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };

    const fakeNear = {
      transfer: async () => {
        throw new Error('socket hang up');
      },
    } as unknown as Parameters<typeof actionService.executeAction>[3];

    await expect(
      actionService.executeAction(env.DB, action.id, 'tnt_acme_000001', fakeNear, {
        correlationId: 'test-correlation',
      }),
    ).rejects.toMatchObject({ code: 'EXECUTION_UNKNOWN' });

    const claim = raw
      .prepare('SELECT state FROM action_claims WHERE action_id = ?')
      .get(action.id) as { state: string };
    expect(claim.state).toBe('unknown');

    const after = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };

    // The reservation must be kept: the money may have moved.
    const reserved = BigInt(after.total_spent_near) - BigInt(before.total_spent_near);
    expect(reserved).toBe(2_000_000_000_000_000_000_000_000n);

    // The action itself must not be marked failed: money may have moved.
    const actionRow = raw
      .prepare('SELECT status FROM actions WHERE id = ?')
      .get(action.id) as { status: string };
    expect(actionRow.status).toBe('approved');
  });
});

describe('spending limit', () => {
  it('refuses a payment above the tenant limit', async () => {
    raw
      .prepare('UPDATE installations SET config = ? WHERE id = ?')
      .run(
        JSON.stringify({ maxRefundNear: '1000' }),
        'inst_acme_cs_001',
      );

    const proposed = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please transfer 100 NEAR to bob.near' },
    });
    largeActionId = proposed.json.data.proposed_action.id;

    await api(`/api/v1/actions/${largeActionId}/approve`, {
      method: 'POST',
      key: approverOneKey,
    });
    await api(`/api/v1/actions/${largeActionId}/approve`, {
      method: 'POST',
      key: approverTwoKey,
    });
    const result = await api(`/api/v1/actions/${largeActionId}/execute`, {
      method: 'POST',
      key: executorKey,
    });

    expect(result.status).toBe(400);
    expect(result.json.error.message).toContain('Spending limit exceeded');
  });
});

describe('installation policy (M-09)', () => {
  it('refuses an amount above the installation cap', async () => {
    raw
      .prepare('UPDATE installations SET config = ? WHERE id = ?')
      .run(
        JSON.stringify({ maxRefundNear: '5' }),
        'inst_acme_cs_001',
      );

    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please refund 30 NEAR to frank.near' },
    });
    expect(result.status).toBe(200);
    expect(result.json.data.proposed_action).toBeNull();
    expect(result.json.data.content).toContain("limit of 5 NEAR");
  });
});

describe('proposal scope separation (M-17)', () => {
  it('lets a chat-only key hold a normal conversation', async () => {
    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      key: chatOnlyKey,
      body: { content: 'Hello there' },
    });
    expect(result.status).toBe(200);
    expect(result.json.data.proposed_action).toBeNull();
  });

  it('blocks a chat-only key from proposing a payment', async () => {
    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      key: chatOnlyKey,
      body: { content: 'Please refund 5 NEAR to alice.near' },
    });
    expect(result.status).toBe(403);
    expect(result.json.error.code).toBe('FORBIDDEN');
  });
});

describe('installation money config is operator-only (M-15)', () => {
  it('rejects a tenant raising maxRefundNear', async () => {
    const result = await api('/api/v1/installations/inst_acme_cs_001', {
      method: 'PATCH',
      body: { config: { maxRefundNear: '1000' } },
    });
    expect(result.status).toBe(400);
    expect(result.json.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a tenant changing feature flags', async () => {
    const result = await api('/api/v1/installations/inst_acme_cs_001', {
      method: 'PATCH',
      body: { config: { features: { nearPayments: true } } },
    });
    expect(result.status).toBe(400);
  });

  it('merges presentation config and preserves the operator cap', async () => {
    const before = raw
      .prepare('SELECT config FROM installations WHERE id = ?')
      .get('inst_acme_cs_001') as { config: string };
    const beforeConfig = JSON.parse(before.config);

    const result = await api('/api/v1/installations/inst_acme_cs_001', {
      method: 'PATCH',
      body: { config: { greeting: 'Updated greeting' } },
    });
    expect(result.status).toBe(200);

    const after = raw
      .prepare('SELECT config FROM installations WHERE id = ?')
      .get('inst_acme_cs_001') as { config: string };
    const afterConfig = JSON.parse(after.config);
    expect(afterConfig.greeting).toBe('Updated greeting');
    expect(afterConfig.maxRefundNear).toBe(beforeConfig.maxRefundNear);
  });
});

describe('amount-based risk (M-18)', () => {
  it('treats a plain 30 NEAR transfer as high risk, independent of wording', async () => {
    raw
      .prepare('UPDATE installations SET config = ? WHERE id = ?')
      .run(JSON.stringify({ maxRefundNear: '50' }), 'inst_acme_cs_001');

    const result = await api(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please transfer 30 NEAR to grace.near' },
    });
    expect(result.status).toBe(200);
    const action = result.json.data.proposed_action;
    expect(action.risk_level).toBe('high');
    expect(action.required_approvals).toBe(2);
  });
});

describe('in-flight actions are never expired (M-19)', () => {
  it('keeps a sending claim out of the expiry sweep', async () => {
    const id = `act_${crypto.randomUUID().replace(/-/g, '')}`;
    raw
      .prepare(
        `INSERT INTO actions (
           id, session_id, tenant_id, type, description, params, risk_level,
           status, proposed_by, approvals, required_approvals, idempotency_key,
           expires_at, created_at, updated_at
         )
         VALUES (?, ?, 'tnt_acme_000001', 'near_transfer', 'in flight', ?,
                 'medium', 'approved', 'key_acme_admin', 1, 1, ?,
                 '2000-01-01 00:00:00', datetime('now'), datetime('now'))`,
      )
      .run(
        id,
        sessionId,
        JSON.stringify({ amount: '1', amount_yocto: '1000000000000000000000000' }),
        `m19-${crypto.randomUUID()}`,
      );
    raw
      .prepare(
        `INSERT INTO action_claims (
           action_id, tenant_id, state, amount_yocto, idempotency_key, reserved,
           attempt_token, claimed_at, updated_at
         )
         VALUES (?, 'tnt_acme_000001', 'sending', '1000000000000000000000000', ?, 1, ?,
                 datetime('now'), datetime('now'))`,
      )
      .run(id, `exec_${id}`, crypto.randomUUID());

    await actionService.expireAllActions(env.DB);

    const row = raw
      .prepare('SELECT status FROM actions WHERE id = ?')
      .get(id) as { status: string };
    expect(row.status).toBe('approved');
  });
});

describe('stale claim retake does not double-reserve (M-13)', () => {
  it('reuses an existing reservation when the claim already reserved', async () => {
    const sessionResult = await api('/api/v1/sessions', {
      method: 'POST',
      body: { installation_id: 'inst_acme_cs_001' },
    });
    const m13Session = sessionResult.json.data.id;
    raw
      .prepare('UPDATE installations SET config = ? WHERE id = ?')
      .run(JSON.stringify({ maxRefundNear: '50' }), 'inst_acme_cs_001');

    const action = await actionService.createAction(env.DB, {
      tenant_id: 'tnt_acme_000001',
      session_id: m13Session,
      type: 'near_transfer',
      description: 'stale retake',
      params: {
        from_account: 'acme-corp.testnet',
        to_account: 'heidi.near',
        amount: '3',
        amount_yocto: '3000000000000000000000000',
      },
      risk_level: 'medium',
      idempotency_key: `m13-${crypto.randomUUID()}`,
      proposed_by: 'key_acme_admin',
    });
    await actionService.approveAction(
      env.DB,
      action.id,
      'tnt_acme_000001',
      'key_approver_1',
    );

    const before = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };

    // Simulate the crashed attempt's successful reservation.
    raw
      .prepare('UPDATE tenants SET total_spent_near = ? WHERE id = ?')
      .run(
        (
          BigInt(before.total_spent_near) +
          3_000_000_000_000_000_000_000_000n
        ).toString(),
        'tnt_acme_000001',
      );

    // A stale executing claim that already reserved must be reused.
    raw
      .prepare(
        `INSERT INTO action_claims (
           action_id, tenant_id, state, amount_yocto, idempotency_key, reserved,
           attempt_token, claimed_at, updated_at
         )
         VALUES (?, 'tnt_acme_000001', 'executing', '3000000000000000000000000', ?, 1, ?,
                 datetime('now', '-10 minutes'), datetime('now', '-10 minutes'))`,
      )
      .run(action.id, `exec_${action.id}`, crypto.randomUUID());

    const result = await actionService.executeAction(
      env.DB,
      action.id,
      'tnt_acme_000001',
      new NearService(true),
    );
    expect(result.status).toBe('executed');

    const after = raw
      .prepare('SELECT total_spent_near FROM tenants WHERE id = ?')
      .get('tnt_acme_000001') as { total_spent_near: string };
    const delta = BigInt(after.total_spent_near) - BigInt(before.total_spent_near);
    expect(delta).toBe(3_000_000_000_000_000_000_000_000n);
  });
});

describe('execution failure auditing (M-20)', () => {
  it('writes an audit row for a definitive execution failure', async () => {
    const failingApp = createApp(
      () =>
        ({
          transfer: async () => {
            throw new NearTransferError('preflight failed', true);
          },
        }) as unknown as NearService,
    );

    const sessionResult = await api('/api/v1/sessions', {
      method: 'POST',
      body: { installation_id: 'inst_acme_cs_001' },
    });
    const failingSession = sessionResult.json.data.id;

    const action = await actionService.createAction(env.DB, {
      tenant_id: 'tnt_acme_000001',
      session_id: failingSession,
      type: 'near_transfer',
      description: 'failure audit',
      params: {
        from_account: 'acme-corp.testnet',
        to_account: 'ivan.near',
        amount: '1',
        amount_yocto: '1000000000000000000000000',
      },
      risk_level: 'medium',
      idempotency_key: `m20-${crypto.randomUUID()}`,
      proposed_by: 'key_acme_admin',
    });
    await actionService.approveAction(
      env.DB,
      action.id,
      'tnt_acme_000001',
      'key_approver_1',
    );

    const response = await failingApp.request(
      `/api/v1/actions/${action.id}/execute`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${executorKey}` },
      },
      env,
    );
    expect(response.status).toBe(502);

    const audit = raw
      .prepare(
        "SELECT action FROM audit_log WHERE resource_id = ? AND action = 'action.execution_failed'",
      )
      .get(action.id) as { action: string } | undefined;
    expect(audit?.action).toBe('action.execution_failed');
  });
});

describe('request limits and pagination', () => {
  it('rejects an oversized body with security headers (M-02, L-09)', async () => {
    const oversized = 'x'.repeat(1_000_100);
    const result = await api('/api/v1/sessions', {
      method: 'POST',
      rawBody: JSON.stringify({ installation_id: oversized }),
    });

    expect(result.status).toBe(413);
    expect(result.json.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('clamps a negative limit (L-01)', async () => {
    const result = await api('/api/v1/agents?limit=-1');
    expect(result.status).toBe(200);
    expect(result.json.meta.limit).toBe(20);
  });
});

describe('operator boundary', () => {
  it('does not allow tenants to create tenants', async () => {
    const result = await api('/api/v1/tenants', {
      method: 'POST',
      body: { name: 'Rogue', slug: 'rogue' },
    });
    expect(result.status).toBe(404);
  });

  it('rejects a tenant key on the operator route', async () => {
    const result = await api('/api/operator/v1/tenants', {
      method: 'POST',
      body: { name: 'Rogue', slug: 'rogue' },
    });
    expect(result.status).toBe(401);
  });

  it('rejects a numeric money amount (M-11)', async () => {
    const result = await api('/api/operator/v1/tenants', {
      key: MASTER_KEY,
      method: 'POST',
      body: { name: 'Numeric Customer', slug: 'numeric-customer', spending_limit_near: 10 },
    });
    expect(result.status).toBe(400);
  });

  it('allows the operator key to create a tenant', async () => {
    const result = await api('/api/operator/v1/tenants', {
      key: MASTER_KEY,
      method: 'POST',
      body: {
        name: 'New Customer',
        slug: 'new-customer',
        spending_limit_near: '10.5',
      },
    });
    expect(result.status).toBe(201);
    expect(result.json.data.slug).toBe('new-customer');
    expect(result.json.data.spending_limit_near).toBe('10.5');
  });

  it('allows the operator to change money controls', async () => {
    const result = await api('/api/operator/v1/tenants/tnt_acme_000001', {
      key: MASTER_KEY,
      method: 'PATCH',
      body: { spending_limit_near: '60', reason: 'Approved credit increase' },
    });
    expect(result.status).toBe(200);
    expect(result.json.data.spending_limit_near).toBe('60');
  });
});

describe('key management', () => {
  it('rejects the legacy umbrella action scope on new keys', async () => {
    const result = await api('/api/v1/keys', {
      method: 'POST',
      body: { name: 'Legacy', scopes: ['actions'] },
    });
    expect(result.status).toBe(400);
  });

  it('rejects an expiry in the past', async () => {
    const result = await api('/api/v1/keys', {
      method: 'POST',
      body: {
        name: 'Expired',
        scopes: ['read'],
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    expect(result.status).toBe(400);
  });

  it('creates a scoped key and returns it once', async () => {
    const result = await api('/api/v1/keys', {
      method: 'POST',
      body: { name: 'Read only', scopes: ['read'] },
    });
    expect(result.status).toBe(201);
    expect(result.json.data.key).toMatch(/^tnt_[0-9a-f]{64}$/);
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
});
