/**
 * Tanat — Core type definitions
 *
 * All types for Cloudflare Worker bindings, database rows,
 * and API request/response shapes.
 */

import type { Context } from "hono";

// ============================================================================
// Cloudflare Worker Environment Bindings
// ============================================================================

/** Environment variables and bindings available in the Worker */
export interface Env {
  // D1 database binding
  DB: D1Database;

  // Defined in wrangler.toml [vars]
  ENVIRONMENT: string;
  API_VERSION: string;
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  PREAUTH_RATE_LIMIT_REQUESTS?: string;
  OPERATOR_RATE_LIMIT_REQUESTS?: string;

  // Defined in .dev.vars (secrets)
  MASTER_API_KEY: string;
  NEAR_NETWORK: string;
  NEAR_RPC_URL: string;
  INTENTS_API_KEY?: string;
  NEAR_AI_API_KEY?: string;
  NEAR_AI_BASE_URL?: string;
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_APP_URL?: string;
  API_KEY_SALT?: string;
  CORS_ORIGINS?: string;
}

/** Variables set by middleware and available on the Hono context */
export interface HonoVariables {
  /** Authenticated tenant ID (set by auth middleware) */
  tenantId: string;
  /** Authenticated API key ID (set by auth middleware) */
  apiKeyId: string;
  /** Scopes granted to the authenticated API key */
  scopes: string[];
  /** Request ID for tracing */
  requestId: string;
}

/** Hono environment type used across the application */
export type HonoEnv = {
  Bindings: Env;
  Variables: HonoVariables;
};

/** Convenience alias for a fully typed Hono context */
export type AppContext = Context<HonoEnv>;

// ============================================================================
// Database Row Types
// ============================================================================

/** tenants table row */
export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "deleted";
  settings: string; // JSON string
  near_account_id: string | null;
  spending_limit_near: string;
  total_spent_near: string;
  created_at: string;
  updated_at: string;
}

/** api_keys table row */
export interface ApiKeyRow {
  id: string;
  tenant_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  scopes: string; // JSON string — e.g. '["read","write"]'
  last_used_at: string | null;
  expires_at: string | null;
  is_active: number; // 0 | 1 (SQLite boolean)
  created_at: string;
  updated_at: string;
}

/** agents table row */
export interface AgentRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  version: number;
  system_prompt: string;
  tools: string; // JSON string
  model: string;
  max_tokens: number;
  temperature: number;
  config: string; // JSON string
  status: "active" | "deprecated" | "archived";
  created_at: string;
  updated_at: string;
}

/** installations table row */
export interface InstallationRow {
  id: string;
  tenant_id: string;
  agent_id: string;
  config: string; // JSON string
  status: "active" | "paused" | "removed";
  created_at: string;
  updated_at: string;
}

/** sessions table row */
export interface SessionRow {
  id: string;
  installation_id: string;
  tenant_id: string;
  user_id: string | null;
  metadata: string; // JSON string
  status: "active" | "closed" | "expired";
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

/** messages table row */
export interface MessageRow {
  id: string;
  session_id: string;
  tenant_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls: string | null; // JSON string
  tool_call_id: string | null;
  tokens_used: number;
  created_at: string;
}

/** actions table row */
export interface ActionRow {
  id: string;
  session_id: string;
  tenant_id: string;
  message_id: string | null;
  type: "near_transfer" | "near_function_call" | "refund" | "payment" | "custom";
  description: string;
  params: string; // JSON string
  risk_level: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "executed" | "failed" | "expired";
  proposed_by: string | null;
  approved_by: string | null;
  second_approved_by: string | null;
  approvals: number;
  required_approvals: number;
  approved_at: string | null;
  executed_at: string | null;
  execution_result: string | null; // JSON string
  idempotency_key: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/** usage_records table row */
export interface UsageRecordRow {
  id: string;
  tenant_id: string;
  type: "api_call" | "tokens" | "near_transaction" | "action";
  quantity: number;
  metadata: string; // JSON string
  recorded_at: string;
}

/** audit_log table row */
export interface AuditLogRow {
  id: string;
  tenant_id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string; // JSON string
  ip_address: string | null;
  created_at: string;
}

// ============================================================================
// Parsed Domain Types (JSON fields deserialized)
// ============================================================================

/** Tenant settings stored as JSON in the settings column */
export interface TenantSettings {
  /** Maximum API calls per billing period */
  maxApiCalls?: number;
  /** Feature flags keyed by feature name */
  features?: Record<string, boolean>;
  /** Allowed AI models */
  allowedModels?: string[];
}

/** A single tool definition stored in agents.tools JSON array */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/** Action params for a NEAR transfer */
export interface NearTransferParams {
  recipient: string;
  amount: string; // yoctoNEAR as string for precision
  memo?: string;
}

/** Action params for a NEAR function call */
export interface NearFunctionCallParams {
  contract: string;
  method: string;
  args: Record<string, unknown>;
  deposit: string; // yoctoNEAR
  gas?: string;
}

// ============================================================================
// API Request Types
// ============================================================================

/** POST /api/v1/tenants — Create a new tenant */
export interface CreateTenantRequest {
  name: string;
  slug: string;
  near_account_id?: string;
  settings?: TenantSettings;
}

/** PATCH /api/v1/tenants/:id — Update a tenant */
export interface UpdateTenantRequest {
  name?: string;
  status?: "active" | "suspended";
  settings?: TenantSettings;
  near_account_id?: string;
  spending_limit_near?: string;
}

/** POST /api/v1/agents — Create a new agent */
export interface CreateAgentRequest {
  name: string;
  slug: string;
  description?: string;
  system_prompt: string;
  tools?: ToolDefinition[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

/** PATCH /api/v1/agents/:id — Update an agent */
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  version?: string;
  system_prompt?: string;
  tools?: ToolDefinition[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  status?: "active" | "deprecated" | "archived";
}

/** POST /api/v1/installations — Install an agent for a tenant */
export interface CreateInstallationRequest {
  agent_id: string;
  config?: Record<string, unknown>;
}

/** POST /api/v1/sessions — Start a new chat session */
export interface CreateSessionRequest {
  installation_id: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

/** POST /api/v1/sessions/:id/messages — Send a message */
export interface SendMessageRequest {
  content: string;
  role?: "user" | "system";
}

/** POST /api/v1/actions/:id/approve — Approve an action */
export interface ApproveActionRequest {
  approved_by: string;
}

/** POST /api/v1/api-keys — Create a new API key */
export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expires_at?: string; // ISO 8601
}

// ============================================================================
// API Response Types
// ============================================================================

/** Standard API envelope for single-resource responses */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Standard API envelope for list responses */
export interface ApiListResponse<T> {
  success: true;
  data: T[];
  pagination?: PaginationMeta;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/** Response when a new API key is created (only time plaintext is returned) */
export interface CreateApiKeyResponse {
  id: string;
  key: string; // plaintext — shown ONCE, never stored
  key_prefix: string;
  name: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
}

/** Public-safe tenant representation (no internal fields) */
export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  status: string;
  near_account_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Public-safe agent representation */
export interface AgentResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  model: string;
  max_tokens: number;
  temperature: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Session response with optional message history */
export interface SessionResponse {
  id: string;
  installation_id: string;
  tenant_id: string;
  user_id: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  messages?: MessageResponse[];
}

/** Individual message in a session */
export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  tool_calls: unknown | null;
  tool_call_id: string | null;
  tokens_used: number;
  created_at: string;
}

/** Action response */
export interface ActionResponse {
  id: string;
  session_id: string;
  type: string;
  description: string;
  params: unknown;
  risk_level: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  execution_result: unknown | null;
  expires_at: string;
  created_at: string;
}
