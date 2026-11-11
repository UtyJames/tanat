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
  sources_used?: Array<{ id: string; title: string; type: string }>;
  memories_used?: number;
  duration_ms?: number;
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

export interface PublishableKey {
  id: string;
  tenant_id: string;
  installation_id: string;
  key_prefix: string;
  key_value: string;
  name: string;
  allowed_origins: string;
  rate_limit_rpm: number;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentChannel {
  id: string;
  tenant_id: string;
  agent_id: string;
  installation_id: string;
  channel_type: 'website' | 'whatsapp' | 'telegram' | 'slack' | 'shopify' | 'email' | 'api' | 'custom';
  name: string;
  config: string;
  status: 'active' | 'pending' | 'paused' | 'coming_soon';
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSource {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  source_type: 'website' | 'faq' | 'document' | 'pdf' | 'text' | 'catalog' | 'policy';
  title: string;
  url: string | null;
  content: string;
  metadata: string;
  status: 'ready' | 'processing' | 'pending' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CustomerMemory {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  user_id: string;
  memory_type: 'fact' | 'preference' | 'context' | 'summary' | 'action_history';
  key: string;
  value: string;
  confidence: number;
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  slug: string;
  category: 'customer' | 'internal' | 'knowledge' | 'custom';
  tagline: string;
  description: string;
  recommended_for_industries: string[];
  recommended_for_responsibilities: string[];
  default_tone: 'professional' | 'friendly' | 'concise' | 'warm' | 'formal' | 'executive';
  default_tools: string[];
  suggested_knowledge: string[];
  suggested_channels: string[];
  safeguards: string[];
  system_prompt_template: string;
  recommendation_score?: number;
}

export interface AgentVersion {
  id: string;
  tenant_id: string;
  agent_id: string;
  version: number;
  system_prompt: string;
  tools: string;
  config: string;
  change_summary: string;
  created_by: string | null;
  created_at: string;
}

export interface IntegrationCatalogueItem {
  type: string;
  name: string;
  category: string;
  status: 'connected' | 'available' | 'beta' | 'coming_soon' | 'pending';
  description: string;
  capabilities: string[];
  configured: boolean;
  config: Record<string, unknown>;
  last_synced_at: string | null;
}

export interface AgentRun {
  id: string;
  tenant_id: string;
  agent_id: string;
  session_id: string | null;
  message_id: string | null;
  channel_type: string;
  status: 'completed' | 'pending_approval' | 'failed' | 'escalated';
  duration_ms: number;
  tokens_used: number;
  model: string;
  privacy_tier: string;
  knowledge_sources_used: string;
  tools_called: string;
  error_message: string | null;
  created_at: string;
  agent_name?: string;
}

export interface WorkspaceAnalytics {
  total_sessions: number;
  total_messages: number;
  total_runs: number;
  avg_duration_ms: number;
  total_tokens: number;
  actions_by_status: Array<{ status: string; count: number }>;
  sessions_by_agent: Array<{ name: string; id: string; session_count: number }>;
  runs_by_channel: Array<{ channel_type: string; count: number }>;
}

export interface WorkspaceMember {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  status: 'active' | 'invited' | 'revoked';
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStatus {
  tenant: {
    id: string;
    name: string;
    slug: string;
    near_account_id: string | null;
    spending_limit_near: string;
  };
  onboarding: {
    completed?: boolean;
    completed_at?: string;
    step?: number;
    industry?: string;
    business_description?: string;
    website_url?: string;
    business_email?: string;
    country?: string;
    timezone?: string;
    selected_capabilities?: string[];
    template_id?: string;
    tone?: string;
    allowed_domains?: string[];
    selected_channels?: string[];
    permissions?: {
      read_only?: string[];
      actions?: string[];
      human_approval?: string[];
      restricted?: string[];
    };
  };
  agents: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    system_prompt: string;
    tools: string;
    model: string;
    config: string;
    status: string;
  }>;
  installations: Array<{
    id: string;
    agent_id: string;
    config: string;
    status: string;
  }>;
  publishable_keys: PublishableKey[];
  channels: AgentChannel[];
  knowledge_sources: Array<{
    id: string;
    agent_id: string | null;
    source_type: string;
    title: string;
    url: string | null;
    status: string;
    created_at: string;
  }>;
  templates: AgentTemplate[];
  supported_industries: Array<{ id: string; label: string; examples: string }>;
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
  sourcesUsed?: Array<{ id: string; title: string; type: string }>;
  memoriesUsed?: number;
  durationMs?: number;
}
