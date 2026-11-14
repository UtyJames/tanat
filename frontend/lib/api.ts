/**
 * Tanat — API client for the browser.
 *
 * The backend accepts Bearer authentication:
 *   Authorization: Bearer tnt_... or tns_...
 *
 * Responses use one envelope:
 *   success: { data, meta? }
 *   failure: { error: { code, message, details? }, requestId }
 */

import type {
  Action,
  Agent,
  AgentChannel,
  AgentRun,
  AgentTemplate,
  AgentVersion,
  ApiKey,
  CreatedApiKey,
  CustomerMemory,
  Installation,
  IntegrationCatalogueItem,
  KnowledgeSource,
  NearBalance,
  OnboardingStatus,
  Paginated,
  PublishableKey,
  SendMessageResult,
  Session,
  Tenant,
  WorkspaceAnalytics,
  WorkspaceMember,
} from './types';

const DEFAULT_API_URL =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787/api/v1'
    : 'https://api.tanat.space/api/v1';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(
  /\/$/,
  '',
);

const STORAGE_KEY = 'tanat_dashboard_session';
const AUTH_URL = API_URL.replace(/\/api\/v1$/, '/api/auth');
const PUBLIC_BASE_URL = API_URL.replace(/\/api\/v1$/, '');

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
  return (
    window.localStorage.getItem(STORAGE_KEY) ??
    window.sessionStorage.getItem(STORAGE_KEY) ??
    ''
  );
}

export function storeKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key) {
    window.localStorage.setItem(STORAGE_KEY, key);
    window.sessionStorage.setItem(STORAGE_KEY, key);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export async function requestOtp(input: {
  email: string;
  tenant_name?: string;
  mode?: 'auto' | 'login' | 'signup';
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

export async function verifyOtp(
  email: string,
  code: string,
  mode?: 'auto' | 'login' | 'signup',
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_URL}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode ? { email, code, mode } : { email, code }),
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
  if (!token.startsWith('tns_')) {
    storeKey('');
    return;
  }
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

const BYOK_STORAGE_KEY = 'tanat_byok_kek';

export function getStoredByokKek(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(BYOK_STORAGE_KEY) ?? '';
}

export function setStoredByokKek(kek: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = kek.trim();
  if (trimmed) {
    window.sessionStorage.setItem(BYOK_STORAGE_KEY, trimmed);
  } else {
    window.sessionStorage.removeItem(BYOK_STORAGE_KEY);
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
  const byokKek = getStoredByokKek();
  if (byokKek) headers['X-Tenant-KEK'] = byokKek;
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
    settings?: Record<string, unknown>;
  },
): Promise<Tenant> {
  return request<Tenant>('PATCH', `/tenants/${tenantId}`, input);
}

// ── Onboarding & Channels ─────────────────────────────────────────────
export function getOnboarding(): Promise<OnboardingStatus> {
  return request<OnboardingStatus>('GET', '/onboarding');
}

export interface CompleteOnboardingInput {
  business_name?: string;
  industry?: string;
  business_description?: string;
  website_url?: string;
  business_email?: string;
  country?: string;
  timezone?: string;
  selected_capabilities?: string[];
  template_id?: string;
  additional_templates?: string[];
  agent_name?: string;
  agent_purpose?: string;
  tone?: 'professional' | 'friendly' | 'concise' | 'warm' | 'formal' | 'executive';
  responsibilities?: string[];
  must_not_do?: string[];
  escalation_rules?: string;
  welcome_message?: string;
  brand_color?: string;
  allowed_domains?: string[];
  knowledge_text?: string;
  knowledge_title?: string;
  faqs?: Array<{ question: string; answer: string }>;
  selected_channels?: Array<
    'website' | 'whatsapp' | 'telegram' | 'slack' | 'shopify' | 'email' | 'api' | 'custom'
  >;
  permissions?: {
    read_only?: string[];
    actions?: string[];
    human_approval?: string[];
    restricted?: string[];
  };
  step?: number;
}

export interface CompleteOnboardingResult {
  completed: boolean;
  agent_id: string;
  installation_id: string;
  publishable_key: string;
  allowed_origins: string[];
  selected_channels: string[];
  widget_snippet: string;
}

export function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  return request<CompleteOnboardingResult>('POST', '/onboarding', input);
}

export function saveOnboardingState(
  state: Record<string, unknown>,
): Promise<{ saved: boolean; onboarding: Record<string, unknown> }> {
  return request<{ saved: boolean; onboarding: Record<string, unknown> }>(
    'PATCH',
    '/onboarding/state',
    state,
  );
}

export function listPublishableKeys(): Promise<PublishableKey[]> {
  return request<PublishableKey[]>('GET', '/onboarding/keys');
}

export function createPublishableKey(input: {
  installation_id: string;
  name?: string;
  allowed_origins?: string[];
  rate_limit_rpm?: number;
}): Promise<{
  id: string;
  key: string;
  prefix: string;
  name: string;
  installation_id: string;
  allowed_origins: string[];
  rate_limit_rpm: number;
}> {
  return request('POST', '/onboarding/keys', input);
}

export function revokePublishableKey(
  keyId: string,
): Promise<{ revoked: boolean }> {
  return request<{ revoked: boolean }>('DELETE', `/onboarding/keys/${keyId}`);
}

export function listChannels(): Promise<AgentChannel[]> {
  return request<AgentChannel[]>('GET', '/onboarding/channels');
}

export function createChannel(input: {
  installation_id: string;
  channel: 'website' | 'whatsapp' | 'telegram' | 'slack' | 'teams' | 'email' | 'api';
  config?: Record<string, unknown>;
  status?: 'connected' | 'pending' | 'error' | 'disabled';
}): Promise<AgentChannel> {
  return request<AgentChannel>('POST', '/onboarding/channels', input);
}

export function updateChannelStatus(
  channelId: string,
  input: {
    status?: 'connected' | 'pending' | 'error' | 'disabled' | 'active' | 'paused' | 'coming_soon';
    config?: Record<string, unknown>;
  },
): Promise<{ data: AgentChannel }> {
  return request<{ data: AgentChannel }>(
    'PATCH',
    `/onboarding/channels/${channelId}`,
    input,
  );
}

export function setupTelegramChannel(
  channelId: string,
): Promise<{ connected: boolean; webhook_url: string; description?: string }> {
  return request<{ connected: boolean; webhook_url: string; description?: string }>(
    'POST',
    `/onboarding/channels/${channelId}/setup-telegram`,
  );
}

// ── Agents ────────────────────────────────────────────────────────────
export function listAgents(): Promise<Paginated<Agent>> {
  return requestPayload<Paginated<Agent>>('GET', '/agents');
}

export function createAgent(input: {
  name: string;
  slug: string;
  description?: string;
  system_prompt: string;
  tools?: unknown[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  config?: Record<string, unknown>;
}): Promise<Agent> {
  return request<Agent>('POST', '/agents', input);
}

export function updateAgent(
  agentId: string,
  input: {
    name?: string;
    description?: string;
    system_prompt?: string;
    tools?: unknown[];
    model?: string;
    max_tokens?: number;
    temperature?: number;
    config?: Record<string, unknown>;
    status?: 'active' | 'inactive' | 'archived';
  },
): Promise<Agent> {
  return request<Agent>('PATCH', `/agents/${agentId}`, input);
}

export function archiveAgent(
  agentId: string,
): Promise<{ archived: boolean }> {
  return request<{ archived: boolean }>('DELETE', `/agents/${agentId}`);
}

// ── Installations ─────────────────────────────────────────────────────
export function listInstallations(): Promise<Installation[]> {
  return request<Installation[]>('GET', '/installations');
}

export function createInstallation(input: {
  agent_id: string;
  config?: Record<string, unknown>;
}): Promise<Installation> {
  return request<Installation>('POST', '/installations', input);
}

export function updateInstallation(
  installationId: string,
  input: {
    config?: Record<string, unknown>;
    status?: 'active' | 'paused' | 'uninstalled';
  },
): Promise<Installation> {
  return request<Installation>('PATCH', `/installations/${installationId}`, input);
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

// ── Platform: Templates, Knowledge, Memories, Versions, Runs, Analytics, Members ──
export function getAgentTemplates(params?: {
  industry?: string;
  responsibilities?: string[];
}): Promise<{
  industries: Array<{ id: string; label: string; examples: string }>;
  templates: AgentTemplate[];
}> {
  const search = new URLSearchParams();
  if (params?.industry) search.set('industry', params.industry);
  if (params?.responsibilities?.length) {
    search.set('responsibilities', params.responsibilities.join(','));
  }
  const qs = search.toString() ? `?${search.toString()}` : '';
  return request('GET', `/platform/templates${qs}`);
}

export function listKnowledge(agentId?: string): Promise<KnowledgeSource[]> {
  const qs = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
  return request<KnowledgeSource[]>('GET', `/platform/knowledge${qs}`);
}

export function createKnowledge(input: {
  agent_id?: string | null;
  source_type: 'website' | 'faq' | 'document' | 'pdf' | 'text' | 'catalog' | 'policy' | 'other' | string;
  title: string;
  url?: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<KnowledgeSource> {
  return request<KnowledgeSource>('POST', '/platform/knowledge', {
    agent_id: input.agent_id,
    source_type: input.source_type,
    kind: input.source_type,
    title: input.title,
    label: input.title,
    url: input.url,
    uri: input.url,
    content: input.content,
    metadata: input.metadata,
  });
}

export function deleteKnowledge(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>('DELETE', `/platform/knowledge/${id}`);
}

export function listMemories(params?: {
  user_id?: string;
  agent_id?: string;
}): Promise<CustomerMemory[]> {
  const search = new URLSearchParams();
  if (params?.user_id) search.set('user_id', params.user_id);
  if (params?.agent_id) search.set('agent_id', params.agent_id);
  const qs = search.toString() ? `?${search.toString()}` : '';
  return request<CustomerMemory[]>('GET', `/platform/memories${qs}`);
}

export function createMemory(input: {
  user_id: string;
  agent_id?: string | null;
  memory_type?: 'fact' | 'preference' | 'context' | 'summary' | 'action_history';
  key: string;
  value: string;
  confidence?: number;
}): Promise<{ id: string; user_id: string; key: string; value: string }> {
  return request('POST', '/platform/memories', input);
}

export function deleteMemory(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>('DELETE', `/platform/memories/${id}`);
}

export function listAgentVersions(agentId: string): Promise<AgentVersion[]> {
  return request<AgentVersion[]>('GET', `/platform/agents/${agentId}/versions`);
}

export function updateAgentLifecycle(
  agentId: string,
  input: {
    lifecycle: 'draft' | 'testing' | 'published' | 'paused' | 'archived';
    change_summary?: string;
  },
): Promise<{
  id: string;
  lifecycle: string;
  status: string;
  version: number;
}> {
  return request('POST', `/platform/agents/${agentId}/lifecycle`, input);
}

export function listIntegrations(): Promise<IntegrationCatalogueItem[]> {
  return request<IntegrationCatalogueItem[]>('GET', '/platform/integrations');
}

export function configureIntegration(input: {
  integration_type: string;
  name: string;
  status?: 'connected' | 'pending' | 'disconnected' | 'coming_soon';
  config?: Record<string, unknown>;
}): Promise<{ id: string; integration_type: string; status: string }> {
  return request('POST', '/platform/integrations', input);
}

export function listRuns(agentId?: string): Promise<AgentRun[]> {
  const qs = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
  return request<AgentRun[]>('GET', `/platform/runs${qs}`);
}

export function getAnalytics(): Promise<WorkspaceAnalytics> {
  return request<WorkspaceAnalytics>('GET', '/platform/analytics');
}

export function listMembers(): Promise<WorkspaceMember[]> {
  return request<WorkspaceMember[]>('GET', '/platform/members');
}

export function inviteMember(input: {
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
}): Promise<{ id: string; email: string; name: string; role: string; status: string }> {
  return request('POST', '/platform/members', input);
}

export function removeMember(id: string): Promise<{ revoked: boolean }> {
  return request<{ revoked: boolean }>('DELETE', `/platform/members/${id}`);
}

export function createVerifiedUserToken(input: {
  installation_id: string;
  user_id: string;
}): Promise<{
  installation_id: string;
  user_id: string;
  user_signature: string;
  widget_attributes: Record<string, string>;
}> {
  return request('POST', '/platform/verify-user-token', input);
}

// ── Privacy & Security Centre ─────────────────────────────────────────
export interface PrivacyStatus {
  data_protection: {
    encryption_enabled: boolean;
    algorithm: string;
    envelope_format: string;
    key_custody_mode?: 'platform_kms' | 'byok_zero_operator';
    zero_operator_byok_active?: boolean;
    encrypted_fields: string[];
    unencrypted_metadata: string[];
    kms: {
      provider: string;
      key_id: string;
      local_dev_mode: boolean;
    };
    active_key: {
      id: string;
      version: number;
      kek_id: string;
      algorithm: string;
      status: string;
      created_at: string;
    } | null;
    keys: Array<{
      id: string;
      version: number;
      kek_id: string;
      algorithm: string;
      status: string;
      created_at: string;
      rotated_at?: string | null;
      revoked_at?: string | null;
    }>;
    retention_days: number;
    deletion_requested_at: string | null;
    deletion_scheduled_for: string | null;
    operator_trust_boundary: string;
  };
  access_control: {
    current_role: string;
    current_scopes: string[];
    members_count: number;
    active_sessions_count: number;
    active_api_keys_count: number;
    available_permissions: string[];
  };
  ai_privacy: {
    provider: string;
    defaultModel: string;
    configured: boolean;
    requireTee: boolean;
    confidentialInferenceModelSupported: boolean;
    perRequestQuoteVerification: boolean;
    enclaveRuntime?: {
      enclaveMode: 'cloudflare_worker' | 'tdx_enclave' | 'dstack_cvm';
      appRunningInTee: boolean;
      kmsMeasurementBound: boolean;
      allowedMrtdConfigured: boolean;
      socketPath: string | null;
      summary: string;
    };
    trustBoundarySummary: string;
  };
  security_events: {
    open_alerts_count: number;
  };
}

export function getPrivacyStatus(): Promise<PrivacyStatus> {
  return request<PrivacyStatus>('GET', '/privacy/status');
}

export function rotateTenantEncryptionKey(): Promise<{ id: string; version: number; status: string }> {
  return request('POST', '/privacy/keys/rotate');
}

export function updatePrivacySettings(input: {
  retention_days?: number;
  require_tee?: boolean;
}): Promise<{ retention_days: number; require_tee: number }> {
  return request('PATCH', '/privacy/settings', input);
}

export function listPrivacyAuditLogs(limit = 40): Promise<Array<Record<string, unknown>>> {
  return request('GET', `/privacy/audit-logs?limit=${limit}`);
}

export function listSecurityAlerts(): Promise<Array<Record<string, unknown>>> {
  return request('GET', '/privacy/alerts');
}

export function resolveSecurityAlert(id: string): Promise<{ id: string; status: string }> {
  return request('POST', `/privacy/alerts/${id}/resolve`);
}

export function listDashboardSessions(): Promise<Array<Record<string, unknown>>> {
  return request('GET', '/privacy/sessions');
}

export function revokePrivacySession(id: string): Promise<{ id: string; revoked: boolean }> {
  return request('DELETE', `/privacy/sessions/${id}`);
}

export function exportWorkspaceData(): Promise<Record<string, unknown>> {
  return request('POST', '/privacy/export');
}

export function requestWorkspaceDeletion(): Promise<{
  deletion_requested_at: string;
  deletion_scheduled_for: string;
}> {
  return request('POST', '/privacy/deletion-request');
}

export interface TeeReceipt {
  id: string;
  chat_id: string;
  model: string;
  nonce: string;
  signing_address: string;
  signing_algo: string;
  request_hash: string;
  response_hash: string;
  tdx_verified: number;
  gpu_verified: number;
  signature_verified: number;
  enclave_mode: string;
  created_at: string;
}

export function listTeeReceipts(): Promise<TeeReceipt[]> {
  return request<TeeReceipt[]>('GET', '/privacy/tee-receipts');
}

export function verifyLiveTeeAttestation(model?: string): Promise<{
  verified: boolean;
  reason?: string;
  enclave_mode: string;
  report?: {
    model: string;
    nonce: string;
    signing_address: string;
    signing_algo: string;
    tdx_present: boolean;
    gpu_attested: boolean;
    gateway_attested: boolean;
    fetched_at: string;
  };
}> {
  return request('POST', '/privacy/tee-verify', model ? { model } : {});
}

export function enableZeroOperatorByok(byok_kek: string): Promise<{
  key_id: string;
  key_custody_mode: 'byok_zero_operator';
  fingerprint: string;
}> {
  return request('POST', '/privacy/byok/enable', { byok_kek });
}

export function disableZeroOperatorByok(byok_kek: string): Promise<{
  key_id: string;
  key_custody_mode: 'platform_kms';
}> {
  return request('POST', '/privacy/byok/disable', { byok_kek });
}

export { API_URL, PUBLIC_BASE_URL };
