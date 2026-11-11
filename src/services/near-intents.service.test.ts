import { describe, expect, it, vi } from 'vitest';
import { NearIntentsService } from './near-intents.service';
import { NearService } from './near.service';

describe('NearIntentsService', () => {
  it('only requests dry quotes and applies the partner API key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ quoteId: 'quote_123' }), { status: 200 }),
    );
    const service = new NearIntentsService('test-jwt', fetcher);

    const quote = await service.requestDryQuote({
      originAsset: 'nep141:wrap.near',
      destinationAsset: 'nep141:usdt.tether-token.near',
      amount: '1000000',
      recipient: 'merchant.near',
      recipientType: 'INTENTS',
      refundTo: 'shopper.near',
      refundType: 'ORIGIN_CHAIN',
      slippageTolerance: 100,
    });

    expect(quote).toMatchObject({ quoteId: 'quote_123' });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://1click.chaindefuser.com/v0/quote');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-jwt');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      dry: true,
      swapType: 'EXACT_INPUT',
      amount: '1000000',
      recipient: 'merchant.near',
    });
  });

  it('rejects malformed token responses', async () => {
    const service = new NearIntentsService(
      undefined,
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify([{ assetId: 'nep141:wrap.near' }]), { status: 200 }),
      ),
    );

    await expect(service.listTokens()).rejects.toMatchObject({
      statusCode: 502,
      code: 'INTENTS_INVALID_RESPONSE',
    });
  });
});

describe('NearService', () => {
  it('does not simulate successful transfers outside the explicit test mock', async () => {
    await expect(
      new NearService().transfer('shop.near', 'merchant.near', 1n),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'NEAR_TRANSFER_REJECTED',
    });
  });

  it('does not return a fabricated balance outside the test mock', async () => {
    await expect(new NearService().checkBalance('shop.near')).rejects.toMatchObject({
      statusCode: 503,
      code: 'NEAR_RPC_UNAVAILABLE',
    });
  });

  it('keeps the explicit test mock available to the approval-flow tests', async () => {
    const result = await new NearService(true).transfer(
      'shop.near',
      'merchant.near',
      1n,
    );
    expect(result.status).toBe('success');
  });
});
