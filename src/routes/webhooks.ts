/**
 * Tanat — Messaging Channel Webhooks
 *
 * Implements public webhook receivers for:
 * 1. Telegram Bot API (updates, inline replies)
 * 2. WhatsApp Business Cloud API (Meta verification, incoming messages)
 * 3. Slack Events API (url_verification challenge, message events)
 *
 * Webhooks bypass global Bearer auth because they are called directly
 * by Telegram, Meta, and Slack servers. Each platform verifies incoming
 * requests using its own signature mechanism:
 * - Telegram: X-Telegram-Bot-Api-Secret-Token
 * - WhatsApp: X-Hub-Signature-256 (HMAC-SHA256) + hub.verify_token
 * - Slack: X-Slack-Signature (HMAC-SHA256 with timestamp)
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { HonoEnv } from '../types';
import type { NearAiFactory } from './sessions';
import { NearAiService } from '../services/near-ai.service';
import { dispatchChannelMessage } from '../services/channel-dispatcher';
import { hmacSha256, timingSafeEqual } from '../utils/crypto';
import {
  formatForMrkdwn,
  formatForTelegramHtml,
  stripMarkdownForPlainText,
} from '../utils/channel-format';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

export interface ChannelRow {
  id: string;
  tenant_id: string;
  installation_id: string;
  channel: 'website' | 'whatsapp' | 'telegram' | 'slack' | 'teams' | 'email' | 'api';
  status: 'connected' | 'pending' | 'error' | 'disabled';
  config: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseJsonConfig<T = Record<string, unknown>>(raw: string | null | undefined): T {
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

export function createWebhooksRouter(
  nearAiFactory: NearAiFactory = (env) => new NearAiService(env.NEAR_AI_API_KEY),
): Hono<HonoEnv> {
  const router = new Hono<HonoEnv>();

  // ── Helper: load channel by ID and type ──────────────────────────────
  async function loadChannel(
    c: Context<HonoEnv>,
    channelId: string,
    expectedType: string,
  ): Promise<ChannelRow> {
    const row = await c.env.DB.prepare(
      'SELECT * FROM agent_channels WHERE (id = ? OR installation_id = ?) AND channel = ? ORDER BY updated_at DESC LIMIT 1',
    )
      .bind(channelId, channelId, expectedType)
      .first<ChannelRow>();

    if (!row) {
      throw new NotFoundError(`Channel (${expectedType})`);
    }
    return row;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. TELEGRAM BOT API
  // ══════════════════════════════════════════════════════════════════════

  router.post('/telegram/:channelId', async (c) => {
    const channelId = c.req.param('channelId');
    const channel = await loadChannel(c, channelId, 'telegram');

    const config = parseJsonConfig<{
      bot_token?: string;
      webhook_secret?: string;
    }>(channel.config);

    if (!config.bot_token) {
      throw new ValidationError('Telegram bot token not configured for this channel');
    }

    // Verify secret token header if configured
    if (config.webhook_secret) {
      const headerSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token') ?? '';
      if (!timingSafeEqual(headerSecret, config.webhook_secret)) {
        throw new UnauthorizedError('Invalid Telegram secret token');
      }
    }

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.json({ ok: false, error: 'Invalid JSON payload' }, 400);
    }

    // Extract message details
    const message = (body as any).message ?? (body as any).edited_message;
    if (!message || !message.text) {
      // Ignore non-text updates (e.g. status changes, stickers) with 200 OK
      return c.json({ ok: true, ignored: true });
    }

    const chatId = message.chat?.id;
    const fromId = message.from?.id ?? chatId;
    const text = String(message.text).trim();

    if (!chatId || !text) {
      return c.json({ ok: true, ignored: true });
    }

    const nearAi = nearAiFactory(c.env);
    const result = await dispatchChannelMessage(c.env.DB, nearAi, {
      tenantId: channel.tenant_id,
      installationId: channel.installation_id,
      channelType: 'telegram',
      channelId: channel.id,
      externalUserId: `tg:${fromId}`,
      messageText: text,
      metadata: {
        chat_id: chatId,
        username: message.from?.username,
        first_name: message.from?.first_name,
      },
    });

    // Send reply back to Telegram (HTML parse mode for clean bold/bullets, with plain fallback)
    try {
      const formattedHtml = formatForTelegramHtml(result.content);
      const tgRes = await fetch(
        `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: formattedHtml,
            parse_mode: 'HTML',
            reply_to_message_id: message.message_id,
          }),
        },
      );
      if (!tgRes.ok) {
        const tgErr = await tgRes.text();
        console.error('[telegram.webhook] HTML sendMessage failed, retrying plain:', tgErr);
        await fetch(
          `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: stripMarkdownForPlainText(result.content),
              reply_to_message_id: message.message_id,
            }),
          },
        );
      }
    } catch (err) {
      console.error('[telegram.webhook] Network error delivering reply:', err);
    }

    return c.json({ ok: true });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 2. WHATSAPP BUSINESS CLOUD API (META)
  // ══════════════════════════════════════════════════════════════════════

  // Meta Webhook Verification challenge
  router.get('/whatsapp/:channelId', async (c) => {
    const channelId = c.req.param('channelId');
    const channel = await loadChannel(c, channelId, 'whatsapp');

    const config = parseJsonConfig<{
      verify_token?: string;
    }>(channel.config);

    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');

    if (mode === 'subscribe' && token && config.verify_token) {
      if (token === config.verify_token) {
        return c.text(challenge ?? '', 200);
      }
    }

    return c.text('Verification token mismatch', 403);
  });

  // Meta Webhook Notifications
  router.post('/whatsapp/:channelId', async (c) => {
    const channelId = c.req.param('channelId');
    const channel = await loadChannel(c, channelId, 'whatsapp');

    const config = parseJsonConfig<{
      phone_number_id?: string;
      access_token?: string;
      app_secret?: string;
      verify_token?: string;
    }>(channel.config);

    const rawBody = await c.req.text();

    // Verify X-Hub-Signature-256 if app_secret is set
    if (config.app_secret) {
      const signatureHeader = c.req.header('X-Hub-Signature-256') ?? '';
      const expectedSig = signatureHeader.startsWith('sha256=')
        ? signatureHeader.slice(7)
        : signatureHeader;
      const computedSig = await hmacSha256(config.app_secret, rawBody);

      if (!timingSafeEqual(computedSig.toLowerCase(), expectedSig.toLowerCase())) {
        throw new UnauthorizedError('Invalid WhatsApp HMAC signature');
      }
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    // Extract incoming WhatsApp messages
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const val = change?.value;
        const messages = val?.messages ?? [];
        for (const msg of messages) {
          if (msg.type === 'text' && msg.text?.body && msg.from) {
            const senderPhone = msg.from;
            const text = msg.text.body.trim();

            const nearAi = nearAiFactory(c.env);
            const result = await dispatchChannelMessage(c.env.DB, nearAi, {
              tenantId: channel.tenant_id,
              installationId: channel.installation_id,
              channelType: 'whatsapp',
              channelId: channel.id,
              externalUserId: `wa:${senderPhone}`,
              messageText: text,
              metadata: {
                whatsapp_id: msg.id,
                name: val.contacts?.[0]?.profile?.name,
              },
            });

            // Send reply via WhatsApp Cloud API
            if (config.access_token && config.phone_number_id) {
              try {
                const waRes = await fetch(
                  `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${config.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: senderPhone,
                      type: 'text',
                      text: { body: formatForMrkdwn(result.content) },
                    }),
                  },
                );
                if (!waRes.ok) {
                  const waErr = await waRes.text();
                  console.error('[whatsapp.webhook] Meta send error:', waErr);
                }
              } catch (err) {
                console.error('[whatsapp.webhook] Network error delivering reply:', err);
              }
            }
          }
        }
      }
    }

    return c.json({ status: 'received' });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 3. SLACK EVENTS API
  // ══════════════════════════════════════════════════════════════════════

  router.post('/slack/:channelId', async (c) => {
    const rawBody = await c.req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    // 1. URL Verification Challenge (must run before channel lookup so manifest creation works)
    if (body?.type === 'url_verification') {
      return c.json({ challenge: body.challenge });
    }

    const channelId = c.req.param('channelId');
    const channel = await loadChannel(c, channelId, 'slack');

    const config = parseJsonConfig<{
      bot_token?: string;
      signing_secret?: string;
    }>(channel.config);

    // 2. Signature verification
    if (config.signing_secret) {
      const timestamp = c.req.header('X-Slack-Request-Timestamp') ?? '';
      const signature = c.req.header('X-Slack-Signature') ?? '';

      // Reject requests older than 5 minutes to prevent replay attacks
      const nowSeconds = Math.floor(Date.now() / 1000);
      const reqSeconds = Number.parseInt(timestamp, 10);
      if (Number.isNaN(reqSeconds) || Math.abs(nowSeconds - reqSeconds) > 300) {
        throw new UnauthorizedError('Slack request timestamp expired or missing');
      }

      const sigBase = `v0:${timestamp}:${rawBody}`;
      const computedHash = await hmacSha256(config.signing_secret, sigBase);
      const expectedSignature = `v0=${computedHash}`;

      if (!timingSafeEqual(expectedSignature, signature)) {
        throw new UnauthorizedError('Invalid Slack request signature');
      }
    }

    // Ignore Slack retries (e.g. if a previous delivery exceeded 3s) to prevent duplicate replies
    if (c.req.header('X-Slack-Retry-Num')) {
      return c.json({ ok: true, ignored: 'retry' });
    }

    // 3. Handle Events Callback
    if (body?.type === 'event_callback' && body.event) {
      const ev = body.event;

      // Ignore messages posted by bots or itself to prevent infinite message loops
      if (ev.bot_id || ev.subtype === 'bot_message') {
        return c.json({ ok: true, ignored: true });
      }

      const isMessage = ev.type === 'message' || ev.type === 'app_mention';
      if (isMessage && ev.text && ev.channel) {
        let text = String(ev.text).trim();
        // Strip out bot user mentions e.g. <@U12345678>
        text = text.replace(/<@[A-Z0-9]+>/g, '').trim();

        if (text.length > 0) {
          const processSlackEvent = async () => {
            const nearAi = nearAiFactory(c.env);
            const result = await dispatchChannelMessage(c.env.DB, nearAi, {
              tenantId: channel.tenant_id,
              installationId: channel.installation_id,
              channelType: 'slack',
              channelId: channel.id,
              externalUserId: `slack:${ev.user ?? 'anonymous'}`,
              messageText: text,
              metadata: {
                slack_channel: ev.channel,
                team: body.team_id,
                thread_ts: ev.thread_ts ?? ev.ts,
              },
            });

            // Send reply via Slack chat.postMessage
            if (config.bot_token) {
              try {
                const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${config.bot_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    channel: ev.channel,
                    text: formatForMrkdwn(result.content),
                    mrkdwn: true,
                    thread_ts: ev.thread_ts ?? ev.ts,
                  }),
                });
                if (!slackRes.ok) {
                  const slackErr = await slackRes.text();
                  console.error('[slack.webhook] chat.postMessage failed:', slackErr);
                }
              } catch (err) {
                console.error('[slack.webhook] Network error delivering reply:', err);
              }
            }
          };

          let scheduled = false;
          try {
            c.executionCtx.waitUntil(processSlackEvent());
            scheduled = true;
          } catch {
            // In unit tests without Cloudflare ExecutionContext, await inline
          }
          if (!scheduled) {
            await processSlackEvent();
          }
        }
      }
    }

    return c.json({ ok: true });
  });

  return router;
}
