/**
 * Tanat — API client for the browser.
 *
 * The backend accepts exactly one authentication scheme:
 *   Authorization: Bearer tnt_...
 *
 * Responses use one envelope:
 *   success: { data, meta? }
 *   failure: { error: { code, message, details? }, requestId }
 */

import type {
  Action,
  Agent,
  ApiKey,
  CreatedApiKey,
  Installation,
  NearBalance,
  Paginated,
  SendMessageResult,
  Session,
  Tenant,
} from './types';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787/api/v1'
).replace(/\/$/, '');

const STORAGE_KEY = 'tanat_dashboard_session';
const AUTH_URL = API_URL.replace(/\/api\/v1$/, '/api/auth');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'ERROR',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getStoredKey(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
}

export function storeKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key) window.sessionStorage.setItem(STORAGE_KEY, key);
  else window.sessionStorage.removeItem(STORAGE_KEY);
}

export async function requestOtp(input: {
  email: string;
  tenant_name: string;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_URL}/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(`Cannot reach the Tanat API at ${API_URL}.`, 0, 'NETWORK_ERROR');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Could not send the verification code.',
      response.status,
      payload?.error?.code ?? 'HTTP_ERROR',
    );
  }
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_URL}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(`Cannot reach the Tanat API at ${API_URL}.`, 0, 'NETWORK_ERROR');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'This code is invalid or expired.',
      response.status,
      payload?.error?.code ?? 'HTTP_ERROR',
    );
  }

  if (typeof payload?.data?.token !== 'string') {
    throw new ApiError('The API returned an invalid sign-in response.', 502);
  }
  storeKey(payload.data.token);
}

export async function revokeDashboardSession(): Promise<void> {
  const token = getStoredKey();
  if (!token.startsWith('tns_')) return;
  try {
    await fetch(`${AUTH_URL}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } finally {
    storeKey('');
  }
}

async function requestPayload<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const apiKey = getStoredKey();
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      `Cannot reach the Tanat API at ${API_URL}. Is the Worker running?`,
      0,
      'NETWORK_ERROR',
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      error?.message ?? response.statusText ?? 'Request failed',
      response.status,
      error?.code ?? 'HTTP_ERROR',
    );
  }

  return payload as T;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const payload = await requestPayload<{ data?: T }>(method, path, body);

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

// ── Tenant ────────────────────────────────────────────────────────────
export function getTenant(): Promise<Tenant> {
  return request<Tenant>('GET', '/tenants');
}

export function updateTenant(
  tenantId: string,
  input: {
    name?: string;
  },
): Promise<Tenant> {
  return request<Tenant>('PATCH', `/tenants/${tenantId}`, input);
}

// ── Agents ────────────────────────────────────────────────────────────
export function listAgents(): Promise<Paginated<Agent>> {
  return requestPayload<Paginated<Agent>>('GET', '/agents');
}

// ── Installations ─────────────────────────────────────────────────────
export function listInstallations(): Promise<Installation[]> {
  return request<Installation[]>('GET', '/installations');
}

// ── Sessions and chat ─────────────────────────────────────────────────
export function listSessions(installationId?: string): Promise<Session[]> {
  const query = installationId
    ? `?installation_id=${encodeURIComponent(installationId)}`
    : '';
  return request<Session[]>('GET', `/sessions${query}`);
}

export function getSession(sessionId: string): Promise<Session> {
  return request<Session>('GET', `/sessions/${sessionId}`);
}

export function createSession(input: {
  installation_id: string;
  user_id?: string;
}): Promise<Session> {
  return request<Session>('POST', '/sessions', input);
}

export function sendMessage(
  sessionId: string,
  content: string,
): Promise<SendMessageResult> {
  return request<SendMessageResult>('POST', `/sessions/${sessionId}/messages`, {
    content,
  });
}

export function closeSession(sessionId: string): Promise<{ closed: boolean }> {
  return request<{ closed: boolean }>('PATCH', `/sessions/${sessionId}`);
}

// ── Actions ───────────────────────────────────────────────────────────
export function listActions(status?: string): Promise<Paginated<Action>> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return requestPayload<Paginated<Action>>('GET', `/actions${query}`);
}

export function getAction(actionId: string): Promise<Action> {
  return request<Action>('GET', `/actions/${actionId}`);
}

export function approveAction(actionId: string): Promise<Action> {
  return request<Action>('POST', `/actions/${actionId}/approve`);
}

export function rejectAction(actionId: string): Promise<Action> {
  return request<Action>('POST', `/actions/${actionId}/reject`);
}

export function executeAction(actionId: string): Promise<Action> {
  return request<Action>('POST', `/actions/${actionId}/execute`);
}

// ── NEAR ──────────────────────────────────────────────────────────────
export function getNearBalance(): Promise<NearBalance> {
  return request<NearBalance>('GET', '/near/balance');
}

// ── API keys ──────────────────────────────────────────────────────────
export function listKeys(): Promise<ApiKey[]> {
  return request<ApiKey[]>('GET', '/keys');
}

export function createKey(input: {
  name: string;
  scopes?: string[];
}): Promise<CreatedApiKey> {
  return request<CreatedApiKey>('POST', '/keys', input);
}

export function revokeKey(keyId: string): Promise<{ revoked: boolean }> {
  return request<{ revoked: boolean }>('DELETE', `/keys/${keyId}`);
}

export { API_URL };
