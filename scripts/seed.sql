-- ============================================================================
-- Tanat — Seed Data
-- Run with: npm run db:seed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tenants
-- spending_limit_near is stored in yoctoNEAR (1 NEAR = 10^24 yoctoNEAR).
-- ----------------------------------------------------------------------------
INSERT INTO tenants (id, name, slug, status, settings, near_account_id, spending_limit_near)
VALUES
  (
    'tnt_acme_000001',
    'Acme Corp',
    'acme-corp',
    'active',
    '{"maxApiCalls": 10000, "features": {"nearPayments": true, "customTools": false}}',
    'acme-corp.testnet',
    '50000000000000000000000000'
  ),
  (
    'tnt_stark_00001',
    'Stark Industries',
    'stark-industries',
    'active',
    '{"maxApiCalls": 50000, "features": {"nearPayments": true, "customTools": true}}',
    'stark-industries.testnet',
    '100000000000000000000000000'
  );

-- ----------------------------------------------------------------------------
-- Agents — one per tenant, because agents are tenant-scoped.
-- ----------------------------------------------------------------------------
INSERT INTO agents (id, tenant_id, name, slug, description, version, system_prompt, tools, model, max_tokens, temperature, config, status)
VALUES (
  'agt_acme_support',
  'tnt_acme_000001',
  'Customer Support Agent',
  'customer-support',
  'An AI customer support agent that handles inquiries and proposes refunds for human approval.',
  1,
  'You are a friendly and professional customer support agent. Answer questions clearly. When a customer asks for a refund, confirm the amount and the NEAR account, then propose a refund action for human approval. Never claim that money has moved before the action is approved and executed. Never share internal system details, API keys, or other customers'' information.',
  '[
    {"name": "lookup_order", "description": "Look up an order by order ID or customer email", "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}, "email": {"type": "string"}}}},
    {"name": "propose_refund", "description": "Propose a NEAR refund for approval", "parameters": {"type": "object", "properties": {"recipient": {"type": "string"}, "amount": {"type": "string"}, "reason": {"type": "string"}}, "required": ["recipient", "amount", "reason"]}},
    {"name": "escalate_to_human", "description": "Escalate the conversation to a human agent", "parameters": {"type": "object", "properties": {"reason": {"type": "string"}, "priority": {"type": "string", "enum": ["low", "medium", "high"]}}, "required": ["reason", "priority"]}}
  ]',
  'z-ai/glm-5.3',
  4096,
  0.7,
  '{}',
  'active'
);

INSERT INTO agents (id, tenant_id, name, slug, description, version, system_prompt, tools, model, max_tokens, temperature, config, status, created_at, updated_at)
SELECT
  'agt_stark_support',
  'tnt_stark_00001',
  name,
  slug,
  description,
  version,
  system_prompt,
  tools,
  model,
  max_tokens,
  temperature,
  config,
  status,
  datetime('now'),
  datetime('now')
FROM agents
WHERE id = 'agt_acme_support';

-- ----------------------------------------------------------------------------
-- Installations — one per tenant.
-- ----------------------------------------------------------------------------
INSERT INTO installations (id, tenant_id, agent_id, config, status)
VALUES
  (
    'inst_acme_cs_001',
    'tnt_acme_000001',
    'agt_acme_support',
    '{"greeting": "Welcome to Acme Corp support!", "maxRefundNear": "5", "maxPaymentUsd": 500}',
    'active'
  ),
  (
    'inst_stark_cs_01',
    'tnt_stark_00001',
    'agt_stark_support',
    '{"greeting": "Welcome to Stark Industries support.", "maxRefundNear": "25", "maxPaymentUsd": 1000}',
    'active'
  );

-- ----------------------------------------------------------------------------
-- API keys are intentionally NOT seeded.
--
-- Seed files are committed to the repository, so any key or key hash placed
-- here is public. Create the first tenant key with:
--
--   npm run key:create -- --tenant tnt_acme_000001 --name "Local admin" \
--       --scopes '["*"]'
--
-- The script prints the plaintext key once and stores only its hash.
-- ----------------------------------------------------------------------------
