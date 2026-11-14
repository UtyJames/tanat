# Tanat Conclave-Parity TEE Enclave Deployment

Tanat protects sensitive tenant data in two layers:

1. **Verifiable Confidential AI Inference (Active Today on Cloudflare Workers + Enclave)**
   - Enforces `TEE`-tier model selection on NEAR AI Cloud (`require_tee = 1`).
   - Fetches nonce-bound hardware attestation reports (`GET /v1/attestation/report?model=...&signing_algo=ecdsa&nonce=...`).
   - Verifies per-request `SHA-256(request_body):SHA-256(response_body)` ECDSA `secp256k1` signatures (`GET /v1/signature/{chat_id}`) using `@noble/secp256k1` + Ethereum address recovery.
   - Persists cryptographic receipts in `tee_attestation_receipts` (`GET /api/v1/privacy/tee-receipts`, `POST /api/v1/privacy/tee-verify`).

2. **App-Layer Hardware TEE Migration (Intel TDX / Phala dstack CVM)**
   - In standard Cloudflare Workers mode, Tanat unwraps tenant DEKs in Worker RAM before calling NEAR AI Cloud.
   - Deploying this `tee/` stack onto a Phala dstack or Intel TDX Confidential VM runs Tanat's own Hono runtime inside an isolated hardware enclave with `/var/run/tappd.sock` mounted and `TEE_RUNTIME_MODE=dstack_cvm`.
   - Set `TEE_ALLOWED_MRTD` to your built image's Intel TDX measurement so `assertEnclavePolicy()` blocks DEK unwrapping outside the attested enclave.

## Build & Deploy

```bash
npm run build:worker
docker compose -f tee/docker-compose.tee.yml up -d --build
```
