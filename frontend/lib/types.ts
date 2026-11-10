/**
 * Tanat — shared API types.
 *
 * These mirror the backend exactly: snake_case fields, money as NEAR decimal
 * strings at the API boundary, and JSON-in-text columns left as strings so
 * the UI decides when to parse them.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ActionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'expired';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: string;
  near_account_id: string | null;
  spending_limit_near: string;
  total_spent_near: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  version: number;
  system_prompt: string;
  tools: string;
  model: string;
  max_tokens: number;
  temperature: number;
  config: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Installation {
  id: string;
  tenant_id: string;
  agent_id: string;
  config: string;
  status: string;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  agent_slug?: string;
}

export interface Session {
  id: string;
  installation_id: string;
  tenant_id: string;
  user_id: string | null;
  metadata: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  agent_name?: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  session_id: string;
  tenant_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls: string | null;
  tool_call_id: string | null;
  tokens_used: number;
  created_at: string;
}

export interface Action {
  id: string;
  session_id: string;
  tenant_id: string;
  message_id: string | null;
  type: string;
  description: string;
  params: string;
  risk_level: RiskLevel;
  status: ActionStatus;
  proposed_by: string | null;
  approved_by: string | null;
  second_approved_by: string | null;
  approvals: number;
  required_approvals: number;
  approved_at: string | null;
  executed_at: string | null;
  execution_result: string | null;
  idempotency_key: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/** Action with JSON columns parsed for display. */
export interface ActionView extends Omit<Action, 'params' | 'execution_result'> {
  params: Record<string, unknown>;
  execution_result: Record<string, unknown> | null;
  amount?: string;
  to_account?: string;
  tx_hash?: string;
}

export interface ProposedAction {
  id: string;
  type: string;
  description: string;
  amount?: string;
  currency?: string;
  risk_level: RiskLevel;
  status: ActionStatus;
  approvals: number;
  required_approvals: number;
  expires_at: string;
}

export interface SendMessageResult {
  id: string;
  session_id: string;
  role: string;
  content: string;
  proposed_action: ProposedAction | null;
  created_at: string;
}

export interface NearBalance {
  account_id: string | null;
  available: string;
  staked: string;
  total: string;
  storage_used?: string;
  spending_limit: string;
  total_spent: string;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_prefix: string;
  name: string;
  scopes: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreatedApiKey {
  id: string;
  key: string;
  prefix: string;
  name: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  proposedAction?: ProposedAction;
}
