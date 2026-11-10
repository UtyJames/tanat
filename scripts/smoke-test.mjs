#!/usr/bin/env node
/**
 * Tanat — end-to-end smoke test.
 *
 * Runs against a live Worker (local or deployed) and exercises the full
 * approval loop, including the rule that money cannot move before approval.
 *
 * Usage:
 *   $env:API_KEY="tnt_..."; `
 *   $env:APPROVER_API_KEY="tnt_..."; `
 *   $env:EXECUTOR_API_KEY="tnt_..."; npm run smoke
 *   $env:BASE_URL="https://tanat-api.example.workers.dev"; npm run smoke
 *
 * The three keys must be distinct credentials for the same tenant:
 *   API_KEY           proposes payments (needs actions:propose)
 *   APPROVER_API_KEY  approves payments (needs actions:approve)
 *   EXECUTOR_API_KEY  executes approved payments (needs actions:execute)
 *
 * Optional:
 *   INSTALLATION_ID  Use a specific installation instead of discovering one.
 *   OTHER_API_KEY    A second tenant's key. When set, the script also checks
 *                    that tenant isolation holds.
 */

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:8787').replace(/\/$/, '');
const API_KEY = process.env.API_KEY;
const APPROVER_API_KEY = process.env.APPROVER_API_KEY;
const EXECUTOR_API_KEY = process.env.EXECUTOR_API_KEY;
const OTHER_API_KEY = process.env.OTHER_API_KEY;
const INSTALLATION_ID = process.env.INSTALLATION_ID;

const missing = [
  ['API_KEY', API_KEY],
  ['APPROVER_API_KEY', APPROVER_API_KEY],
  ['EXECUTOR_API_KEY', EXECUTOR_API_KEY],
].filter(([, value]) => !value);

if (missing.length > 0) {
  console.error(
    `Missing required key(s): ${missing.map(([name]) => name).join(', ')}.`,
  );
  console.error(
    'Money controls require separation of duties: a proposer, an approver, and an executor.',
  );
  process.exit(2);
}

if (new Set([API_KEY, APPROVER_API_KEY, EXECUTOR_API_KEY]).size !== 3) {
  console.error('API_KEY, APPROVER_API_KEY, and EXECUTOR_API_KEY must be distinct.');
  process.exit(2);
}

let failures = 0;
let checks = 0;

function pass(name, detail = '') {
  checks += 1;
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  checks += 1;
  failures += 1;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, { method = 'GET', key = API_KEY, body } = {}) {
  const headers = { Authorization: `Bearer ${key}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    // Non-JSON responses are reported by the caller through the status code.
  }

  return { status: response.status, json, headers: response.headers };
}

function section(title) {
  console.log(`\n${title}`);
}

async function main() {
  console.log(`Tanat smoke test → ${BASE_URL}`);

  section('Health');
  {
    const res = await fetch(`${BASE_URL}/health`);
    const json = await res.json().catch(() => null);
    if (res.status === 200 && json?.status === 'ok') pass('GET /health');
    else fail('GET /health', `status ${res.status}`);
  }

  section('Authentication');
  {
    const res = await fetch(`${BASE_URL}/api/v1/tenants`);
    if (res.status === 401) pass('rejects requests without a key');
    else fail('rejects requests without a key', `status ${res.status}`);
  }
  {
    const res = await fetch(`${BASE_URL}/api/v1/tenants`, {
      headers: { 'X-API-Key': API_KEY },
    });
    if (res.status === 401) pass('rejects the legacy X-API-Key header');
    else fail('rejects the legacy X-API-Key header', `status ${res.status}`);
  }
  {
    const res = await request('/api/v1/tenants', { key: 'tnt_definitely_invalid' });
    if (res.status === 401) pass('rejects an invalid key');
    else fail('rejects an invalid key', `status ${res.status}`);
  }

  section('Tenant context');
  let tenantId;
  {
    const res = await request('/api/v1/tenants');
    if (res.status === 200 && res.json?.data?.id) {
      tenantId = res.json.data.id;
      pass('GET /api/v1/tenants', tenantId);
    } else {
      fail('GET /api/v1/tenants', `status ${res.status}`);
    }
  }

  section('Installations');
  let installationId = INSTALLATION_ID;
  if (!installationId) {
    const res = await request('/api/v1/installations');
    const list = res.json?.data ?? [];
    if (res.status === 200 && list.length > 0) {
      installationId = list[0].id;
      pass('GET /api/v1/installations', `${list.length} found, using ${installationId}`);
    } else {
      fail('GET /api/v1/installations', 'no installations found; run npm run db:seed');
      return;
    }
  } else {
    pass('using INSTALLATION_ID', installationId);
  }

  section('Chat session');
  let sessionId;
  {
    const res = await request('/api/v1/sessions', {
      method: 'POST',
      body: { installation_id: installationId, user_id: 'smoke-test-user' },
    });
    if (res.status === 201 && res.json?.data?.id) {
      sessionId = res.json.data.id;
      pass('POST /api/v1/sessions', sessionId);
    } else {
      fail('POST /api/v1/sessions', `status ${res.status}`);
      return;
    }
  }

  {
    const res = await request(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Hello, what can you do?' },
    });
    if (res.status === 200 && typeof res.json?.data?.content === 'string') {
      pass('chat returns an assistant reply');
    } else {
      fail('chat returns an assistant reply', `status ${res.status}`);
    }
  }

  section('Approval gate');
  let actionId;
  {
    const res = await request(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content: 'Please refund 5 NEAR to alice.near' },
    });
    const action = res.json?.data?.proposed_action;
    if (res.status === 200 && action?.id && action?.status === 'pending') {
      actionId = action.id;
      pass('money request creates a pending action', actionId);
    } else {
      fail('money request creates a pending action', `status ${res.status}`);
      return;
    }
  }

  {
    const res = await request(`/api/v1/actions/${actionId}/execute`, {
      method: 'POST',
      key: EXECUTOR_API_KEY,
    });
    if (res.status === 409) pass('refuses to execute before approval');
    else fail('refuses to execute before approval', `status ${res.status}`);
  }

  {
    const res = await request(`/api/v1/actions/${actionId}`, { key: API_KEY });
    const params = res.json?.data?.params;
    if (res.status === 200 && params) {
      pass('action is scoped to the tenant and readable');
    } else {
      fail('action is scoped to the tenant and readable', `status ${res.status}`);
    }
  }

  section('Separation of duties');
  {
    const res = await request(`/api/v1/actions/${actionId}/approve`, {
      method: 'POST',
      key: API_KEY,
    });
    if (res.status === 403) {
      pass('the proposer cannot approve its own action');
    } else {
      fail('the proposer cannot approve its own action', `status ${res.status}`);
    }
  }

  section('Approve and execute');
  {
    const res = await request(`/api/v1/actions/${actionId}/approve`, {
      method: 'POST',
      key: APPROVER_API_KEY,
    });
    if (res.status === 200 && res.json?.data?.status === 'approved') {
      pass('POST /approve with the approver key');
    } else {
      fail('POST /approve with the approver key', `status ${res.status}`);
    }
  }

  {
    const res = await request(`/api/v1/actions/${actionId}/execute`, {
      method: 'POST',
      key: EXECUTOR_API_KEY,
    });
    if (res.status === 200 && res.json?.data?.status === 'executed') {
      pass('POST /execute moves the action to executed');
    } else {
      fail('POST /execute moves the action to executed', `status ${res.status}`);
    }
  }

  {
    const res = await request(`/api/v1/actions/${actionId}/execute`, {
      method: 'POST',
      key: EXECUTOR_API_KEY,
    });
    if (res.status === 200 && res.json?.data?.status === 'executed') {
      pass('execute is idempotent');
    } else {
      fail('execute is idempotent', `status ${res.status}`);
    }
  }

  if (OTHER_API_KEY) {
    section('Tenant isolation');
    {
      const res = await request(`/api/v1/actions/${actionId}`, { key: OTHER_API_KEY });
      if (res.status === 404) pass('another tenant cannot read this action');
      else fail('another tenant cannot read this action', `status ${res.status}`);
    }
    {
      const res = await request(`/api/v1/sessions/${sessionId}`, { key: OTHER_API_KEY });
      if (res.status === 404) pass('another tenant cannot read this session');
      else fail('another tenant cannot read this session', `status ${res.status}`);
    }
  }

  section('Result');
  console.log(`${checks - failures}/${checks} checks passed`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nSmoke test crashed:', error);
  process.exitCode = 1;
});
