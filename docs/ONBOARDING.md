# Three-Step Resumable Onboarding

## Flow (`frontend/app/start/page.tsx`)
1. **Step 1 — Create workspace:** Collects only Business Name, Industry, and Work Email (with inline OTP verification if not yet signed in).
2. **Step 2 — Choose an AI agent:** Offers 6 security-hardened templates (`Customer Support Agent`, `Sales Assistant`, `HR Assistant`, `Operations Assistant`, `Finance Assistant`, `Custom Agent`) with least-privilege defaults.
3. **Step 3 — Deploy and test:** Choose initial channel (`website`, `telegram`, `slack`, `api`, or skip), test immediately in the built-in sandbox, and publish to see *"Your AI agent is ready"* with contextual links to `/app`.

## Resumability & Security
- Progress is persisted via `PATCH /api/v1/onboarding/state` (`{ step, draft }`) and restored on return via `GET /api/v1/onboarding`.
- `POST /api/v1/onboarding/keys` rejects wildcard (`*`) origins in production (`ENVIRONMENT === 'production'`), requiring explicit `https://` origins.
- Advanced settings (knowledge uploads, team RBAC, approvals, spending limits, Privacy Centre) live in `/app`.
