import { describe, expect, it, vi } from 'vitest';
import { NearAiService } from './near-ai.service';

function modelsResponse(models: unknown[]): Response {
  return new Response(JSON.stringify({ data: models }), { status: 200 });
}

describe('NearAiService', () => {
  it('calls the OpenAI-compatible chat endpoint with a bearer key and tools', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
      if (String(url).endsWith('/models')) {
        return modelsResponse([
          {
            id: 'test/tee-model',
            name: 'Test TEE',
            owned_by: 'attested 3p',
            description: 'Served in a TEE',
            context_length: 8192,
            supported_features: ['tools'],
            is_ready: true,
          },
        ]);
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'I can help.',
                tool_calls: [
                  {
                    id: 'call_1',
                    function: {
                      name: 'propose_near_payment',
                      arguments: '{"amount_near":"1"}',
                    },
                  },
                ],
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200 },
      );
    });

    const service = new NearAiService('test-key', fetcher);
    const result = await service.chat({
      model: 'test/tee-model',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'propose_near_payment',
            description: 'test',
            parameters: { type: 'object' },
          },
        },
      ],
      requireTee: true,
    });

    expect(result.content).toBe('I can help.');
    expect(result.toolCalls).toEqual([
      {
        id: 'call_1',
        name: 'propose_near_payment',
        arguments: '{"amount_near":"1"}',
      },
    ]);
    expect(result.privacyTier).toBe('tee');
    expect(result.usage.totalTokens).toBe(15);

    const [url, init] = fetcher.mock.calls.at(-1)!;
    expect(url).toBe('https://cloud-api.near.ai/v1/chat/completions');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-key');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'test/tee-model',
      tool_choice: 'auto',
    });
  });

  it('refuses a non-TEE model when the tenant requires confidential inference', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      modelsResponse([
        {
          id: 'test/open-model',
          owned_by: 'openrouter',
          description: 'Standard endpoint',
          supported_features: [],
          is_ready: true,
        },
      ]),
    );

    const service = new NearAiService('test-key', fetcher);

    await expect(
      service.chat({
        model: 'test/open-model',
        messages: [{ role: 'user', content: 'hello' }],
        requireTee: true,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'NEAR_AI_TEE_REQUIRED',
    });
  });

  it('labels privacy tiers from model metadata', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      modelsResponse([
        { id: 'a/tee', owned_by: 'attested 3p', is_ready: true },
        { id: 'b/zdr', owned_by: 'openrouter', description: 'zero data retention' },
        { id: 'c/plain', owned_by: 'vendor' },
        { id: 'broken' },
      ]),
    );

    const service = new NearAiService('test-key', fetcher);
    const models = await service.listModels(true);

    expect(models.find((model) => model.id === 'a/tee')?.privacyTier).toBe('tee');
    expect(models.find((model) => model.id === 'b/zdr')?.privacyTier).toBe('zdr');
    expect(models.find((model) => model.id === 'c/plain')?.privacyTier).toBe('standard');
  });
});
