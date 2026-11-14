# AI Privacy & Execution Security

## Context Minimization & Boundary Enforcement (`src/services/ai-privacy.service.ts`)
- **Secret Redaction:** `redactSecrets()` strips `tnt_`, `pk_live_`, `pk_test_`, `tns_`, `sk-`, `xoxb-`, and `Bearer` tokens before prompts leave Tanat or enter audit logs.
- **Context Minimization:** `minimizeKnowledgeContext()` scores and selects only the top-K relevant knowledge sources (`maxSources = 6`, bounded by `maxChars`) rather than sending the entire knowledge base on every prompt.
- **Prompt Injection Boundaries:** Retrieved knowledge is wrapped in `<source>` data tags with explicit system instructions treating retrieved text as untrusted data.
- **Tool Authorization:** AI models never hold authorization authority. Financial actions (`propose_near_payment`) only create `pending` action rows validated by backend limits and human-in-the-loop separation-of-duties (`action.service.ts`).

## Confidential Inference & Honest Trust Boundaries
- **Implemented:** `require_tee` policy flag (`tenant_privacy_settings.require_tee`) refuses non-TEE models in `NearAiService.chat()`.
- **Verified Limitation:** NEAR AI Cloud `/v1/chat/completions` does not currently return a per-request cryptographic Intel TDX quote to Tanat's backend, and Tanat's Cloudflare Worker decrypts tenant context in memory before sending inference requests. The Privacy Centre displays this limitation transparently.
