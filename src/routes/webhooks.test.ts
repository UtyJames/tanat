/**
 * Tanat — Messaging Channel Webhooks Tests
 *
 * Verifies webhook handlers for Telegram, WhatsApp, and Slack,
 * including signature verification, message dispatching, and channel management.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import type { Env } from '../types';
import { createTestDatabase } from '../test/d1-shim';
import { generateApiKey, hashApiKey, hmacSha256 } from '../utils/crypto';
import { NearService } from '../services/near.service';

const SALT = 'test-salt-secret';
const MASTER_KEY = 'test-master-key';

let env: Env;
let app: ReturnType<typeof createApp>;
let tenantKey = '';
let tenantId = 't_test_webhooks';
let installationId = 'inst_test_webhooks';
let agentId = 'ag_test_webhooks';

let telegramChannelId = 'chn_tg_1';
let whatsappChannelId = 'chn_wa_1';
let slackChannelId = 'chn_slack_1';

const TG_SECRET = 'tg-super-secret-token-123';
const WA_VERIFY_TOKEN = 'wa-verify-challenge-token';
const WA_APP_SECRET = 'wa-app-secret-abcdef';
const SLACK_SIGNING_SECRET = 'slack-signing-secret-xyz';

// Mock global fetch for external messaging provider APIs
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeAll(async () => {
  const db = createTestDatabase();

  env = {
    DB: db.d1,
    ENVIRONMENT: 'test',
    API_VERSION: 'v1',
    RATE_LIMIT_REQUESTS: '1000',
    RATE_LIMIT_WINDOW_SECONDS: '60',
    MASTER_API_KEY: MASTER_KEY,
    NEAR_NETWORK: 'testnet',
    NEAR_RPC_URL: 'https://rpc.testnet.near.org',
    API_KEY_SALT: SALT,
  };

  app = createApp(() => new NearService(true));

  // 1. Create tenant
  await db.d1
    .prepare(
      `INSERT INTO tenants (id, name, slug, status, settings, spending_limit_near, total_spent_near)
       VALUES (?, ?, ?, 'active', '{}', '50', '0')`,
    )
    .bind(tenantId, 'Acme Messaging Co', 'acme-messaging')
    .run();

  // 2. Create API key
  const { key, prefix } = generateApiKey();
  tenantKey = key;
  const keyHash = await hashApiKey(key, SALT);
  await db.d1
    .prepare(
      `INSERT INTO api_keys (id, tenant_id, key_hash, key_prefix, name, scopes, is_active)
       VALUES (?, ?, ?, ?, 'Owner Key', '["read","write","sessions"]', 1)`,
    )
    .bind('key_owner_wh', tenantId, keyHash, prefix)
    .run();

  // 3. Create Agent & Installation
  await db.d1
    .prepare(
      `INSERT INTO agents (id, tenant_id, name, slug, description, system_prompt, model, status)
       VALUES (?, ?, 'Acme Bot', 'acme-bot', 'Support Bot', 'Help customers with store questions.', 'test-model', 'active')`,
    )
    .bind(agentId, tenantId)
    .run();

  await db.d1
    .prepare(
      `INSERT INTO installations (id, tenant_id, agent_id, config, status)
       VALUES (?, ?, ?, '{}', 'active')`,
    )
    .bind(installationId, tenantId, agentId)
    .run();

  // 4. Seed Channels
  // Telegram channel
  await db.d1
    .prepare(
      `INSERT INTO agent_channels (id, tenant_id, installation_id, channel, status, config)
       VALUES (?, ?, ?, 'telegram', 'connected', ?)`,
    )
    .bind(
      telegramChannelId,
      tenantId,
      installationId,
      JSON.stringify({
        bot_token: '123456:ABC-DEF-GHI',
        webhook_secret: TG_SECRET,
      }),
    )
    .run();

  // WhatsApp channel
  await db.d1
    .prepare(
      `INSERT INTO agent_channels (id, tenant_id, installation_id, channel, status, config)
       VALUES (?, ?, ?, 'whatsapp', 'connected', ?)`,
    )
    .bind(
      whatsappChannelId,
      tenantId,
      installationId,
      JSON.stringify({
        phone_number_id: '1092837465',
        access_token: 'EAAB_test_wa_access_token',
        verify_token: WA_VERIFY_TOKEN,
        app_secret: WA_APP_SECRET,
      }),
    )
    .run();

  // Slack channel
  await db.d1
    .prepare(
      `INSERT INTO agent_channels (id, tenant_id, installation_id, channel, status, config)
       VALUES (?, ?, ?, 'slack', 'connected', ?)`,
    )
    .bind(
      slackChannelId,
      tenantId,
      installationId,
      JSON.stringify({
        bot_token: 'xoxb-test-slack-bot-token',
        signing_secret: SLACK_SIGNING_SECRET,
      }),
    )
    .run();
});

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
    text: async () => JSON.stringify({ ok: true }),
  });
});

describe('Telegram Bot Webhook', () => {
  it('rejects update with invalid secret token', async () => {
    const res = await app.request(
      `/api/webhooks/telegram/${telegramChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret',
        },
        body: JSON.stringify({
          update_id: 1,
          message: { chat: { id: 123 }, text: 'Hello' },
        }),
      },
      env,
    );

    expect(res.status).toBe(401);
  });

  it('accepts valid update, runs dispatcher, and calls Telegram sendMessage', async () => {
    const res = await app.request(
      `/api/webhooks/telegram/${telegramChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': TG_SECRET,
        },
        body: JSON.stringify({
          update_id: 1001,
          message: {
            message_id: 42,
            from: { id: 998877, first_name: 'Bob', username: 'bob_tg' },
            chat: { id: 998877, type: 'private' },
            text: 'When do you open tomorrow?',
          },
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);

    // Verify Telegram sendMessage was invoked
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bot123456:ABC-DEF-GHI/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.chat_id).toBe(998877);
    expect(callBody.reply_to_message_id).toBe(42);
    expect(typeof callBody.text).toBe('string');
  });

  it('ignores non-text updates cleanly with 200 OK', async () => {
    const res = await app.request(
      `/api/webhooks/telegram/${telegramChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': TG_SECRET,
        },
        body: JSON.stringify({
          update_id: 1002,
          message: {
            message_id: 43,
            chat: { id: 998877 },
            photo: [{ file_id: 'xyz' }],
          },
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ignored).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('WhatsApp Business Cloud API Webhook', () => {
  it('handles GET verification handshake with correct verify token', async () => {
    const challenge = 'random_challenge_string_12345';
    const res = await app.request(
      `/api/webhooks/whatsapp/${whatsappChannelId}?hub.mode=subscribe&hub.verify_token=${WA_VERIFY_TOKEN}&hub.challenge=${challenge}`,
      { method: 'GET' },
      env,
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe(challenge);
  });

  it('rejects GET verification handshake with incorrect verify token', async () => {
    const res = await app.request(
      `/api/webhooks/whatsapp/${whatsappChannelId}?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test`,
      { method: 'GET' },
      env,
    );

    expect(res.status).toBe(403);
  });

  it('rejects POST notifications with missing or invalid HMAC signature', async () => {
    const payload = JSON.stringify({ object: 'whatsapp_business_account' });
    const res = await app.request(
      `/api/webhooks/whatsapp/${whatsappChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=invalid_signature_hash',
        },
        body: payload,
      },
      env,
    );

    expect(res.status).toBe(401);
  });

  it('accepts valid signed WhatsApp message and sends reply via Meta Cloud API', async () => {
    const payloadObj = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550001111', phone_number_id: '1092837465' },
                contacts: [{ profile: { name: 'Sarah' }, wa_id: '15559876543' }],
                messages: [
                  {
                    from: '15559876543',
                    id: 'wamid.HBgLMTU1...',
                    timestamp: '1700000000',
                    text: { body: 'Do you offer international shipping?' },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const rawPayload = JSON.stringify(payloadObj);
    const validSig = await hmacSha256(WA_APP_SECRET, rawPayload);

    const res = await app.request(
      `/api/webhooks/whatsapp/${whatsappChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${validSig}`,
        },
        body: rawPayload,
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.status).toBe('received');

    // Verify Meta Cloud API call
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/1092837465/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer EAAB_test_wa_access_token',
        }),
      }),
    );

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.to).toBe('15559876543');
    expect(sentBody.type).toBe('text');
  });
});

describe('Slack Events API Webhook', () => {
  it('handles url_verification challenge', async () => {
    const challenge = 'slack_test_challenge_string';
    const res = await app.request(
      `/api/webhooks/slack/${slackChannelId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url_verification',
          token: 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
          challenge,
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.challenge).toBe(challenge);
  });

  it('rejects events with invalid Slack signature', async () => {
    const rawPayload = JSON.stringify({
      type: 'event_callback',
      event: { type: 'message', text: 'Hello', user: 'U12345', channel: 'C12345' },
    });

    const res = await app.request(
      `/api/webhooks/slack/${slackChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Slack-Request-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Slack-Signature': 'v0=bad_signature',
        },
        body: rawPayload,
      },
      env,
    );

    expect(res.status).toBe(401);
  });

  it('accepts valid Slack message event and posts reply to Slack channel', async () => {
    const rawPayload = JSON.stringify({
      token: 'verification_token',
      team_id: 'T123456',
      api_app_id: 'A123456',
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'C0987654',
        user: 'U9876543',
        text: 'How do I submit an expense report?',
        ts: '1700000001.000100',
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sigBase = `v0:${timestamp}:${rawPayload}`;
    const hash = await hmacSha256(SLACK_SIGNING_SECRET, sigBase);
    const signature = `v0=${hash}`;

    const res = await app.request(
      `/api/webhooks/slack/${slackChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Slack-Request-Timestamp': timestamp,
          'X-Slack-Signature': signature,
        },
        body: rawPayload,
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer xoxb-test-slack-bot-token',
        }),
      }),
    );

    const callPayload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callPayload.channel).toBe('C0987654');
    expect(typeof callPayload.text).toBe('string');
  });

  it('ignores messages from bots to prevent infinite response loops', async () => {
    const rawPayload = JSON.stringify({
      type: 'event_callback',
      event: {
        type: 'message',
        bot_id: 'B12345',
        channel: 'C0987654',
        text: 'I am a bot speaking',
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sigBase = `v0:${timestamp}:${rawPayload}`;
    const hash = await hmacSha256(SLACK_SIGNING_SECRET, sigBase);
    const signature = `v0=${hash}`;

    const res = await app.request(
      `/api/webhooks/slack/${slackChannelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Slack-Request-Timestamp': timestamp,
          'X-Slack-Signature': signature,
        },
        body: rawPayload,
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.ignored).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('Channel Configuration & Management API', () => {
  it('allows updating channel configuration and status', async () => {
    const res = await app.request(
      `/api/v1/onboarding/channels/${telegramChannelId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tenantKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'connected',
          config: { bot_token: 'new-valid-token:123' },
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.data.status).toBe('connected');
    expect(body.data.config.bot_token).toBe('new-valid-token:123');
  });

  it('lists configured channels for the tenant', async () => {
    const res = await app.request(
      '/api/v1/onboarding/channels',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${tenantKey}` },
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('automates Telegram setWebhook registration', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, description: 'Webhook was set' }),
    });

    const res = await app.request(
      `/api/v1/onboarding/channels/${telegramChannelId}/setup-telegram`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tenantKey}` },
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.data.connected).toBe(true);
    expect(body.data.webhook_url).toContain(`/api/webhooks/telegram/${telegramChannelId}`);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/setWebhook'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});

