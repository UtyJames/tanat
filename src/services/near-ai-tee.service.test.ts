import { describe, expect, it } from 'vitest';
import * as secp256k1 from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { NearAiService } from './near-ai.service';
import { sha256Hex } from './near-ai-tee.service';
import { assertEnclavePolicy, getEnclaveRuntimeStatus } from './enclave-runtime.service';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signEip191(message: string, privateKey: Uint8Array): Promise<{ address: string; signature: string }> {
  const pubUncompressed = secp256k1.Point.fromBytes(secp256k1.getPublicKey(privateKey, false))
    .toBytes(false)
    .slice(1);
  const address = `0x${bytesToHex(keccak_256(pubUncompressed).slice(-20))}`.toLowerCase();

  const msgBytes = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msgBytes.length}`);
  const full = new Uint8Array(prefix.length + msgBytes.length);
  full.set(prefix, 0);
  full.set(msgBytes, prefix.length);
  const digest = keccak_256(full);

  // secp256k1 v3 'recovered' returns [recovery(1), r(32), s(32)]; Ethereum puts v(27|28) last
  const rec = await secp256k1.signAsync(digest, privateKey, { prehash: false, format: 'recovered' });
  const ethSig = new Uint8Array(65);
  ethSig.set(rec.slice(1), 0);
  ethSig[64] = rec[0] + 27;

  return { address, signature: `0x${bytesToHex(ethSig)}` };
}

describe('NEAR AI Cloud Verifiable TEE & Conclave Enclave Policy', () => {
  it('cryptographically verifies /v1/attestation/report + /v1/signature/{chat_id} via secp256k1 ECDSA recovery', async () => {
    const privKey = new Uint8Array(32).fill(7);
    const pubUncompressed = secp256k1.Point.fromBytes(secp256k1.getPublicKey(privKey, false))
      .toBytes(false)
      .slice(1);
    const teeAddress = `0x${bytesToHex(keccak_256(pubUncompressed).slice(-20))}`.toLowerCase();

    const responseBody = JSON.stringify({
      id: 'chatcmpl_tee_123',
      choices: [{ message: { content: 'Verified inside Intel TDX + H100 TEE' } }],
      usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
    });

    let capturedReqBody = '';
    const mockFetch: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({
            data: [{ id: 'tee/glm-5.3', owned_by: 'near-ai', description: 'Intel TDX TEE attested', is_ready: true }],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith('/chat/completions')) {
        capturedReqBody = String(init?.body ?? '');
        return new Response(responseBody, { status: 200 });
      }
      if (url.includes('/attestation/report')) {
        return new Response(
          JSON.stringify({
            signing_address: teeAddress,
            signing_algo: 'ecdsa',
            model_attestations: [{ intel_tdx: { quote: 'tdx_quote_hex' }, nvidia_payload: { evidence: 'gpu_nras' } }],
          }),
          { status: 200 },
        );
      }
      if (url.includes('/signature/chatcmpl_tee_123')) {
        const reqHash = await sha256Hex(capturedReqBody);
        const resHash = await sha256Hex(responseBody);
        const signed = await signEip191(`${reqHash}:${resHash}`, privKey);
        return new Response(
          JSON.stringify({
            text: `${reqHash}:${resHash}`,
            signature: signed.signature,
            signing_address: signed.address,
            signing_algo: 'ecdsa',
          }),
          { status: 200 },
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const ai = new NearAiService('test-key', mockFetch);
    const result = await ai.chat({
      model: 'tee/glm-5.3',
      messages: [{ role: 'user', content: 'Hello TEE' }],
      requireTee: true,
      verifyTeeAttestation: true,
      strictTeeVerification: true,
    });

    expect(result.chatId).toBe('chatcmpl_tee_123');
    expect(result.teeProof?.verified).toBe(true);
    expect(result.teeProof?.attestation?.tdxPresent).toBe(true);
    expect(result.teeProof?.attestation?.gpuAttested).toBe(true);
    expect(result.teeProof?.signatureVerification?.hashMatched).toBe(true);
    expect(result.teeProof?.signatureVerification?.signatureVerified).toBe(true);
    expect(result.teeProof?.signatureVerification?.recoveredAddress).toBe(teeAddress);
  });

  it('fails closed in strict TEE verification mode when response hash or signature is tampered', async () => {
    const privKey = new Uint8Array(32).fill(9);
    const pubUncompressed = secp256k1.Point.fromBytes(secp256k1.getPublicKey(privKey, false))
      .toBytes(false)
      .slice(1);
    const teeAddress = `0x${bytesToHex(keccak_256(pubUncompressed).slice(-20))}`.toLowerCase();

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/models')) {
        return new Response(
          JSON.stringify({ data: [{ id: 'tee/glm-5.3', description: 'TEE', is_ready: true }] }),
          { status: 200 },
        );
      }
      if (url.endsWith('/chat/completions')) {
        return new Response(
          JSON.stringify({ id: 'chatcmpl_bad', choices: [{ message: { content: 'Tampered' } }] }),
          { status: 200 },
        );
      }
      if (url.includes('/attestation/report')) {
        return new Response(
          JSON.stringify({ signing_address: teeAddress, intel_tdx: { quote: 'q' } }),
          { status: 200 },
        );
      }
      if (url.includes('/signature/chatcmpl_bad')) {
        const fakeText = '0000:1111';
        const signed = await signEip191(fakeText, privKey);
        return new Response(
          JSON.stringify({ text: fakeText, signature: signed.signature, signing_address: signed.address }),
          { status: 200 },
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const ai = new NearAiService('test-key', mockFetch);
    await expect(
      ai.chat({
        model: 'tee/glm-5.3',
        messages: [{ role: 'user', content: 'Hello' }],
        requireTee: true,
        verifyTeeAttestation: true,
        strictTeeVerification: true,
      }),
    ).rejects.toMatchObject({ code: 'NEAR_AI_TEE_VERIFICATION_FAILED' });
  });

  it('enforces enclave MRTD measurement policy in dstack_cvm / tdx_enclave mode', () => {
    const workerStatus = getEnclaveRuntimeStatus({ TEE_RUNTIME_MODE: 'cloudflare_worker' });
    expect(workerStatus.appRunningInTee).toBe(false);

    const enclaveEnv = {
      TEE_RUNTIME_MODE: 'dstack_cvm' as const,
      TEE_ALLOWED_MRTD: 'abcd1234',
    };
    expect(getEnclaveRuntimeStatus(enclaveEnv).appRunningInTee).toBe(true);
    expect(() => assertEnclavePolicy(enclaveEnv, 'abcd1234')).not.toThrow();
    expect(() => assertEnclavePolicy(enclaveEnv, 'deadbeef')).toThrow(/MRTD measurement/);
  });
});
