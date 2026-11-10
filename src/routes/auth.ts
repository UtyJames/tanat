import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generateId, hashApiKey } from '../utils/crypto';
import { AppError, RateLimitError, UnauthorizedError } from '../utils/errors';
import { logAudit, requestIp } from '../utils/audit';
import { parseNearToYocto } from '../utils/money';

export const authRouter = new Hono<HonoEnv>();

const otpRequestSchema = z.object({
  email: z.string().email().max(254),
  tenant_name: z.string().trim().min(2).max(100),
}).strict();

const otpVerifySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
}).strict();

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const SESSION_TTL_DAYS = 7;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

function generateOtp(): string {
  const range = 0x1_0000_0000;
  const cutoff = Math.floor(range / 1_000_000) * 1_000_000;
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= cutoff);
  return String(random[0] % 1_000_000).padStart(6, '0');
}

function randomToken(prefix: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')}`;
}

async function hashOtp(email: string, code: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${email}:${code}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function equalDigest(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function consumeAuthLimit(
  c: Context<HonoEnv>,
  identifier: string,
  limit: number,
): Promise<void> {
  const windowStart = Math.floor(Date.now() / AUTH_RATE_WINDOW_MS) * AUTH_RATE_WINDOW_MS;
  const result = await c.env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(identifier, windowStart)
    .first<{ count: number }>();

  if ((result?.count ?? limit + 1) > limit) {
    throw new RateLimitError('Too many sign-in requests. Please try again later.');
  }
}

async function sendOtp(
  env: HonoEnv['Bindings'],
  email: string,
  code: string,
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM) {
    throw new AppError(
      'Email sign-in is not configured. Tanat needs a verified sending domain and Resend API key.',
      503,
      'EMAIL_AUTH_NOT_CONFIGURED',
    );
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: [email],
      subject: 'Your Tanat verification code',
      text: `Your Tanat verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. If you did not request this code, you can ignore this email.`,
      html: `<!doctype html><html><body><p>Your Tanat verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.</p></body></html>`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    throw new AppError('Could not send the verification email. Please try again.', 502, 'EMAIL_DELIVERY_FAILED');
  });

  if (!response.ok) {
    console.error('Resend email request failed', { status: response.status });
    throw new AppError('Could not send the verification email. Please try again.', 502, 'EMAIL_DELIVERY_FAILED');
  }
}

authRouter.post('/otp/request', validateBody(otpRequestSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof otpRequestSchema>>(c);
  const salt = c.env.API_KEY_SALT ?? '';
  if (!salt) {
    throw new AppError('API_KEY_SALT is not configured', 500, 'CONFIG_ERROR');
  }

  const email = body.email.trim().toLowerCase();
  const emailHash = await hashApiKey(email, salt);
  const clientIp = requestIp(c) ?? 'unknown';
  const ipHash = await hashApiKey(clientIp, salt);
  await consumeAuthLimit(c, `auth-email:${emailHash}`, 3);
  await consumeAuthLimit(c, `auth-ip:${ipHash}`, 10);

  const code = generateOtp();
  const tokenHash = await hashOtp(email, code, salt);
  await c.env.DB.prepare(
    "DELETE FROM auth_link_tokens WHERE expires_at <= datetime('now') OR used_at IS NOT NULL",
  ).run();
  await c.env.DB.prepare(
    `UPDATE auth_link_tokens SET used_at = datetime('now')
     WHERE email = ? AND used_at IS NULL`,
  )
    .bind(email)
    .run();
  await c.env.DB.prepare(
    `UPDATE auth_link_tokens SET used_at = datetime('now')
     WHERE email = ? AND used_at IS NULL`,
  )
    .bind(email)
    .run();
  await c.env.DB.prepare(
    `INSERT INTO auth_link_tokens (token_hash, email, tenant_name, expires_at, attempts)
     VALUES (?, ?, ?, datetime('now', ?), 0)`,
  )
    .bind(tokenHash, email, body.tenant_name.trim(), `+${OTP_TTL_MINUTES} minutes`)
    .run();

  try {
    await sendOtp(c.env, email, code);
  } catch (error) {
    await c.env.DB.prepare('DELETE FROM auth_link_tokens WHERE token_hash = ?')
      .bind(tokenHash)
      .run();
    throw error;
  }

  await logAudit(c.env.DB, {
    tenantId: 'unknown',
    action: 'auth.otp_sent',
    resourceType: 'email',
    resourceId: await hashApiKey(email, salt),
    details: {},
    ipAddress: requestIp(c),
  });

  return c.json({
    data: { sent: true },
    message: 'If this address can sign in, a verification code has been sent.',
  }, 202);
});

authRouter.post('/otp/verify', validateBody(otpVerifySchema), async (c) => {
  const { email: rawEmail, code } = getValidatedBody<z.infer<typeof otpVerifySchema>>(c);
  const email = rawEmail.trim().toLowerCase();
  const salt = c.env.API_KEY_SALT ?? '';
  if (!salt) throw new AppError('API_KEY_SALT is not configured', 500, 'CONFIG_ERROR');
  const ipHash = await hashApiKey(requestIp(c) ?? 'unknown', salt);
  await consumeAuthLimit(c, `auth-verify-ip:${ipHash}`, 10);

  const otp = await c.env.DB.prepare(
    `SELECT token_hash, email, tenant_name FROM auth_link_tokens
     WHERE email = ? AND used_at IS NULL AND expires_at > datetime('now')
       AND attempts < ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(email, MAX_OTP_ATTEMPTS)
    .first<{ token_hash: string; email: string; tenant_name: string }>();

  if (!otp) throw new UnauthorizedError('This code is invalid or has expired.');

  const attempt = await c.env.DB.prepare(
    `UPDATE auth_link_tokens SET attempts = attempts + 1
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
       AND attempts < ?
     RETURNING attempts`,
  )
    .bind(otp.token_hash, MAX_OTP_ATTEMPTS)
    .first<{ attempts: number }>();
  if (!attempt) throw new UnauthorizedError('This code is invalid or has expired.');

  const submittedHash = await hashOtp(email, code, salt);
  if (!equalDigest(submittedHash, otp.token_hash)) {
    throw new UnauthorizedError('This code is incorrect or has expired.');
  }

  const consumed = await c.env.DB.prepare(
    `UPDATE auth_link_tokens SET used_at = datetime('now')
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
       AND attempts <= ?`,
  )
    .bind(otp.token_hash, MAX_OTP_ATTEMPTS)
    .run();
  if (consumed.meta.changes !== 1) throw new UnauthorizedError('This code has already been used.');

  let user = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.tenant_id, t.name AS tenant_name
     FROM dashboard_users u JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = ? AND t.status = 'active'`,
  )
    .bind(otp.email)
    .first<{ id: string; email: string; tenant_id: string; tenant_name: string }>();

  if (!user) {
    const userId = generateId('usr');
    const tenantId = generateId('ten');
    const agentId = generateId('agt');
    const installationId = generateId('inst');
    const slugBase = otp.tenant_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 35) || 'workspace';
    const slug = `${slugBase}-${tenantId.slice(-8)}`;

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO tenants (id, name, slug, status, settings, near_account_id, spending_limit_near, total_spent_near)
         SELECT ?, ?, ?, 'active', '{}', NULL, ?, '0'
         WHERE NOT EXISTS (SELECT 1 FROM dashboard_users WHERE email = ?)`,
      ).bind(tenantId, otp.tenant_name, slug, parseNearToYocto('0').toString(), otp.email),
      c.env.DB.prepare(
        `INSERT INTO dashboard_users (id, email, tenant_id)
         SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM tenants WHERE id = ?)
         ON CONFLICT(email) DO NOTHING`,
      ).bind(userId, otp.email, tenantId, tenantId),
      c.env.DB.prepare(
        `INSERT INTO agents (id, tenant_id, name, slug, description, system_prompt, tools, model, max_tokens, temperature, config)
         SELECT ?, ?, 'Store Assistant', 'store-assistant',
           'Starter agent for customer support and payment-intent previews.',
           'Help customers with store questions. Never claim that a payment has settled. Payment actions require human approval.',
           '[]', 'gpt-4o-mini', 4096, 0.7, '{}'
         WHERE EXISTS (SELECT 1 FROM dashboard_users WHERE id = ? AND tenant_id = ?)
         ON CONFLICT(tenant_id, slug) DO NOTHING`,
      ).bind(agentId, tenantId, userId, tenantId),
      c.env.DB.prepare(
        `INSERT INTO installations (id, tenant_id, agent_id, config, status)
         SELECT ?, ?, ?, '{"features":{"nearPayments":false},"maxRefundNear":"0"}', 'active'
         WHERE EXISTS (SELECT 1 FROM agents WHERE id = ? AND tenant_id = ?)
         ON CONFLICT(tenant_id, agent_id) DO NOTHING`,
      ).bind(installationId, tenantId, agentId, agentId, tenantId),
    ]);

    user = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.tenant_id, t.name AS tenant_name
       FROM dashboard_users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = ? AND t.status = 'active'`,
    )
      .bind(otp.email)
      .first<{ id: string; email: string; tenant_id: string; tenant_name: string }>();
  }

  if (!user) throw new AppError('Could not provision the workspace', 500, 'WORKSPACE_PROVISION_FAILED');

  const sessionToken = randomToken('tns');
  const sessionHash = await hashApiKey(sessionToken, salt);
  const sessionId = generateId('dss');
  await c.env.DB.prepare(
    `INSERT INTO dashboard_sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, datetime('now', ?))`,
  )
    .bind(sessionId, user.id, sessionHash, `+${SESSION_TTL_DAYS} days`)
    .run();

  return c.json({
    data: {
      token: sessionToken,
      expires_in: SESSION_TTL_DAYS * 24 * 60 * 60,
      user: { id: user.id, email: user.email },
      tenant: { id: user.tenant_id, name: user.tenant_name },
    },
  });
});

authRouter.post('/logout', async (c) => {
  const authorization = c.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ data: { logged_out: true } });
  }

  const salt = c.env.API_KEY_SALT ?? '';
  if (!salt) throw new AppError('API_KEY_SALT is not configured', 500, 'CONFIG_ERROR');
  const tokenHash = await hashApiKey(authorization.slice(7).trim(), salt);
  await c.env.DB.prepare(
    `UPDATE dashboard_sessions SET revoked_at = datetime('now')
     WHERE token_hash = ? AND revoked_at IS NULL`,
  )
    .bind(tokenHash)
    .run();
  return c.json({ data: { logged_out: true } });
});
