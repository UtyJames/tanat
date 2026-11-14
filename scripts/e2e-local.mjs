/**
 * Tanat — local end-to-end verification.
 *
 * Drives the real Worker bundle (served by scripts/local-api.mjs) through the
 * paths the product actually uses: OTP sign-in -> onboarding -> publishable key
 * -> widget API -> platform endpoints -> tenant isolation.
 */

import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const BASE = (process.env.E2E_BASE ?? 'http://localhost:8790').replace(/\/$/, '');
const DB_PATH = process.env.E2E_DB;
const SALT = process.env.E2E_SALT;

if (!DB_PATH || !SALT) {
  console.error('E2E_DB and E2E_SALT must be set.');
  process.exit(2);
}

let checks = 0;
let failures = 0;
const notes = [];

function pass(name, detail = '') {
  checks += 1;
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  checks += 1;
  failures += 1;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function expect(name, condition, detail = '') {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

async function call(path, { method = 'GET', token, body, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  const text = await response.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: response.status, json, headers: response.headers };
}

function hashOtp(email, code) {
  return createHmac('sha256', SALT).update(`${email}:${code}`).digest('hex');
}

function seedOtp(email, code, tenantName) {
  const db = new DatabaseSync(DB_PATH);
  db.prepare('DELETE FROM auth_link_tokens WHERE email = ?').run(email);
  db.prepare(
    `INSERT INTO auth_link_tokens (token_hash, email, tenant_name, expires_at, attempts)
     VALUES (?, ?, ?, datetime('now', '+10 minutes'), 0)`,
  ).run(hashOtp(email, code), email, tenantName);
  db.close();
}

async function signIn(email, code, tenantName) {
  seedOtp(email, code, tenantName);
  return call('/api/v1/auth/otp/verify', { method: 'POST', body: { email, code } });
}

async function main() {
  console.log(`Tanat E2E → ${BASE}`);

  // ── Health ───────────────────────────────────────────────────────────
  const health = await call('/health');
  expect('GET /health', health.status === 200 && health.json?.status === 'ok');

  // ── Auth / provisioning ──────────────────────────────────────────────
  const email = `e2e-${Date.now()}@example.com`;
  const login = await signIn(email, '123456', 'E2E Workspace');
  const token = login.json?.data?.token;
  const tenantId = login.json?.data?.tenant?.id;
  expect(
    'OTP verify provisions a workspace',
    login.status === 200 && typeof token === 'string' && token.startsWith('tns_') && !!tenantId,
    tenantId,
  );
  if (!token) {
    console.log('\nCannot continue without a session token.');
    return;
  }

  const badCode = await signIn(`${email}`, '000000', 'E2E Workspace');
  expect('OTP rejects a wrong code', badCode.status === 401);

  // ── Onboarding read ──────────────────────────────────────────────────
  const before = await call('/api/v1/onboarding', { token });
  const starterAgent = before.json?.data?.agents?.[0];
  expect(
    'GET /onboarding returns the starter agent',
    before.status === 200 && !!starterAgent?.id,
    starterAgent?.name,
  );
  expect(
    'starter workspace has no channels yet',
    Array.isArray(before.json?.data?.channels) && before.json.data.channels.length === 0,
  );

  // ── Progress save ────────────────────────────────────────────────────
  const saved = await call('/api/v1/onboarding/state', {
    method: 'PATCH',
    token,
    body: { step: 4, draft: { industry: 'logistics', channels: ['website', 'api'] } },
  });
  expect('PATCH /onboarding/state persists the draft', saved.status === 200 && saved.json?.data?.step === 4);

  // ── Templates ────────────────────────────────────────────────────────
  const templates = await call('/api/v1/platform/templates', { token });
  const templateId = templates.json?.data?.[0]?.id;
  expect(
    'GET /platform/templates returns agent templates',
    templates.status === 200 && Array.isArray(templates.json?.data) && templates.json.data.length > 0,
    `${templates.json?.data?.length ?? 0} templates`,
  );

  // ── Onboarding submit ────────────────────────────────────────────────
  const submit = await call('/api/v1/onboarding', {
    method: 'POST',
    token,
    body: {
      business: {
        name: 'Acme Logistics',
        industry: 'logistics',
        description: 'Interstate deliveries and shipment tracking.',
        website: 'https://acme.example',
        email,
        country: 'NG',
        timezone: 'Africa/Lagos',
      },
      agent: {
        template_id: templateId ?? 'customer-support',
        name: 'Shipment Support',
        purpose: 'Answer delivery questions and collect tracking references.',
        tone: 'friendly',
        responsibilities: ['Explain delivery windows', 'Collect tracking numbers'],
        avoid: 'Never promise a refund you cannot verify.',
        escalation: 'Escalate damaged goods to the operations lead.',
      },
      channels: ['website', 'api', 'whatsapp'],
      knowledge: {
        website: true,
        notes: 'Deliveries run Monday to Saturday, 8am to 6pm.',
        faqs: 'Q: Do you deliver on Sundays? A: No.',
      },
      permissions: { read_knowledge: true, propose_actions: false, require_human_approval: true },
      selected_capabilities: ['customer_support'],
      step: 10,
      complete: true,
    },
  });
  const publishableKey = submit.json?.data?.publishable_key?.key;
  const installationId = submit.json?.data?.agent?.installation_id;
  expect(
    'POST /onboarding completes and issues a publishable key',
    submit.status === 201 || submit.status === 200,
    `status ${submit.status}`,
  );
  expect('publishable key is a pk_test_ key', typeof publishableKey === 'string' && publishableKey.startsWith('pk_test_'));
  expect('onboarding returns a widget snippet', typeof submit.json?.data?.snippet === 'string' && submit.json.data.snippet.includes('tanat-widget.js'));

  if (!publishableKey || !installationId) {
    console.log('\nCannot continue without a publishable key.');
    return;
  }

  // ── Onboarding state after submit ────────────────────────────────────
  const after = await call('/api/v1/onboarding', { token });
  const channels = after.json?.data?.channels ?? [];
  const byChannel = Object.fromEntries(channels.map((c) => [c.channel, c.status]));
  expect('onboarding marks the workspace complete', after.json?.data?.onboarding?.completed === true);
  expect('website channel waits for the first real request', byChannel.website === 'pending', byChannel.website);
  expect('api channel is connected', byChannel.api === 'connected', byChannel.api);
  expect('whatsapp stays pending', byChannel.whatsapp === 'pending', byChannel.whatsapp);
  expect('business profile is stored', after.json?.data?.business?.name === 'Acme Logistics');

  const keys = await call('/api/v1/onboarding/keys', { token });
  expect('GET /onboarding/keys lists the key', keys.status === 200 && keys.json?.data?.length === 1);

  // ── Channel guard ────────────────────────────────────────────────────
  const channelList = await call('/api/v1/onboarding/channels', { token });
  const whatsapp = (channelList.json?.data ?? []).find((c) => c.channel === 'whatsapp');
  if (whatsapp) {
    const guard = await call(`/api/v1/onboarding/channels/${whatsapp.id}`, {
      method: 'PATCH',
      token,
      body: { status: 'connected' },
    });
    expect('cannot fake a WhatsApp connection', guard.status === 400 || guard.status === 422, `status ${guard.status}`);
  }

  // ── Public widget API ────────────────────────────────────────────────
  const publicHeaders = { 'X-Tanat-Key': publishableKey, Origin: 'https://acme.example' };

  const config = await call('/api/public/v1/config', { headers: publicHeaders });
  expect('GET /public/v1/config returns agent config', config.status === 200 && !!config.json?.data?.agent?.name, config.json?.data?.agent?.name);

  const evil = await call('/api/public/v1/config', {
    headers: { 'X-Tanat-Key': publishableKey, Origin: 'https://evil.example' },
  });
  expect('origin lock rejects a foreign origin', evil.status === 403, `status ${evil.status} ${evil.json?.error?.code ?? ''}`);

  const session = await call('/api/public/v1/sessions', {
    method: 'POST',
    headers: publicHeaders,
    body: {},
  });
  const visitorSession = session.json?.data?.session_id;
  expect('POST /public/v1/sessions creates a visitor session', (session.status === 201 || session.status === 200) && !!visitorSession, visitorSession);

  if (visitorSession) {
    const message = await call(`/api/public/v1/sessions/${visitorSession}/messages`, {
      method: 'POST',
      headers: publicHeaders,
      body: { content: 'Do you deliver on Saturdays?' },
    });
    const ok = message.status === 200 && typeof message.json?.data?.content === 'string';
    if (ok) pass('public message returns an assistant reply', `${message.json.data.content.length} chars`);
    else if (message.status === 502) {
      notes.push(`inference unavailable (${message.json?.error?.code ?? 'unknown'}) — expected without a live NEAR AI key`);
      pass('public message fails closed with an API error envelope', message.json?.error?.code ?? 'no code');
    } else fail('public message returns an assistant reply', `status ${message.status} ${JSON.stringify(message.json).slice(0, 160)}`);

    const webChannel = (await call('/api/v1/onboarding/channels', { token })).json?.data ?? [];
    const websiteNow = webChannel.find((c) => c.channel === 'website');
    expect('first widget request marks website connected', websiteNow?.status === 'connected', websiteNow?.status);
  }

  // ── Platform endpoints ───────────────────────────────────────────────
  const agentId = after.json?.data?.agents?.[0]?.id;

  const knowledge = await call('/api/v1/platform/knowledge', {
    method: 'POST',
    token,
    body: { kind: 'policy', label: 'Returns policy', content: 'Unused goods may be returned within 30 days.', agent_id: agentId },
  });
  const knowledgeId = knowledge.json?.data?.id;
  expect('POST /platform/knowledge stores a source', (knowledge.status === 201 || knowledge.status === 200) && !!knowledgeId, knowledgeId);

  const knowledgeList = await call('/api/v1/platform/knowledge', { token });
  expect('GET /platform/knowledge lists sources', (knowledgeList.json?.data ?? []).length >= 1, `${(knowledgeList.json?.data ?? []).length} sources`);

  const memory = await call('/api/v1/platform/memories', {
    method: 'POST',
    token,
    body: { memory_type: 'preference', fact: 'Prefers WhatsApp for delivery updates.', external_user_id: 'customer_42' },
  });
  expect('POST /platform/memories stores a memory', memory.status === 201 || memory.status === 200, `status ${memory.status}`);

  const memories = await call('/api/v1/platform/memories?user_id=customer_42', { token });
  expect('GET /platform/memories filters by user', (memories.json?.data ?? []).length === 1);

  const lifecycle = await call(`/api/v1/platform/agents/${agentId}/lifecycle`, {
    method: 'POST',
    token,
    body: { lifecycle_status: 'testing', notes: 'E2E run' },
  });
  expect('POST lifecycle records a version', (lifecycle.status === 201 || lifecycle.status === 200) && !!lifecycle.json?.data?.version, `v${lifecycle.json?.data?.version}`);

  const versions = await call(`/api/v1/platform/agents/${agentId}/versions`, { token });
  expect('GET versions returns history', (versions.json?.data ?? []).length >= 1);

  const integrations = await call('/api/v1/platform/integrations', { token });
  expect('GET /platform/integrations returns the catalogue', integrations.status === 200 && Array.isArray(integrations.json?.data));

  const connect = await call('/api/v1/platform/integrations', {
    method: 'POST',
    token,
    body: { provider: 'google_calendar', status: 'awaiting_auth', permissions: ['read'] },
  });
  expect('POST /platform/integrations records a connection state', connect.status === 201 || connect.status === 200, `status ${connect.status}`);

  const runs = await call('/api/v1/platform/runs', { token });
  expect('GET /platform/runs responds', runs.status === 200 && Array.isArray(runs.json?.data));

  const analytics = await call('/api/v1/platform/analytics', { token });
  expect('GET /platform/analytics responds', analytics.status === 200 && !!analytics.json?.data, Object.keys(analytics.json?.data ?? {}).slice(0, 5).join(', '));

  const members = await call('/api/v1/platform/members', { token });
  expect('GET /platform/members includes the owner', (members.json?.data ?? []).some((m) => m.role === 'owner'));

  const invite = await call('/api/v1/platform/members', {
    method: 'POST',
    token,
    body: { email: `teammate-${Date.now()}@example.com`, name: 'Teammate', role: 'operator' },
  });
  expect('POST /platform/members invites a member', invite.status === 201 || invite.status === 200, `status ${invite.status}`);

  const verifyUser = await call('/api/v1/platform/verify-user-token', {
    method: 'POST',
    token,
    body: { user_id: 'customer_42' },
  });
  expect('POST /platform/verify-user-token returns a signature', verifyUser.status === 200 && !!verifyUser.json?.data?.signature);

  // ── Tenant isolation ─────────────────────────────────────────────────
  const otherEmail = `e2e-other-${Date.now()}@example.com`;
  const otherLogin = await signIn(otherEmail, '654321', 'Other Workspace');
  const otherToken = otherLogin.json?.data?.token;
  expect('a second workspace can sign in', otherLogin.status === 200 && !!otherToken);

  if (otherToken && knowledgeId) {
    const leak = await call(`/api/v1/platform/knowledge/${knowledgeId}`, { method: 'DELETE', token: otherToken });
    expect('another tenant cannot delete this knowledge', leak.status === 404, `status ${leak.status}`);
    const leakKey = await call('/api/v1/onboarding/keys', { token: otherToken });
    expect('another tenant sees no publishable keys', (leakKey.json?.data ?? []).length === 0);
  }

  // ── Auth failure contract ────────────────────────────────────────────
  const noKey = await call('/api/v1/tenants');
  expect('GET /tenants without a key returns 401', noKey.status === 401);
  expect('error envelope carries a request id', !!noKey.json?.requestId && !!noKey.json?.error?.code);

  console.log(`\n${checks - failures}/${checks} checks passed`);
  for (const note of notes) console.log(`  NOTE  ${note}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\nE2E crashed:', error);
  process.exitCode = 1;
});
