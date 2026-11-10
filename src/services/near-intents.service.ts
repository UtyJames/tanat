import { AppError } from '../utils/errors';

const API_BASE_URL = 'https://1click.chaindefuser.com/v0';
const REQUEST_TIMEOUT_MS = 10_000;

export interface IntentsQuoteRequest {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS';
  refundTo: string;
  refundType: 'ORIGIN_CHAIN' | 'INTENTS';
  slippageTolerance: number;
}

export interface IntentsToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
}

export class NearIntentsService {
  constructor(
    private readonly apiKey?: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async listTokens(): Promise<IntentsToken[]> {
    const response = await this.request(`${API_BASE_URL}/tokens`);
    const body = await this.responseJson(response);
    if (!Array.isArray(body)) {
      throw new AppError('NEAR Intents returned an invalid token list', 502, 'INTENTS_INVALID_RESPONSE');
    }

    return body.map((token: unknown) => {
      if (
        !token ||
        typeof token !== 'object' ||
        !('assetId' in token) ||
        typeof token.assetId !== 'string' ||
        !('decimals' in token) ||
        typeof token.decimals !== 'number' ||
        !('blockchain' in token) ||
        typeof token.blockchain !== 'string' ||
        !('symbol' in token) ||
        typeof token.symbol !== 'string'
      ) {
        throw new AppError('NEAR Intents returned an invalid token entry', 502, 'INTENTS_INVALID_RESPONSE');
      }

      return {
        assetId: token.assetId,
        decimals: token.decimals,
        blockchain: token.blockchain,
        symbol: token.symbol,
      };
    });
  }

  async requestDryQuote(input: IntentsQuoteRequest): Promise<Record<string, unknown>> {
    const response = await this.request(`${API_BASE_URL}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dry: true,
        swapType: 'EXACT_INPUT',
        slippageTolerance: input.slippageTolerance,
        originAsset: input.originAsset,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: input.destinationAsset,
        amount: input.amount,
        recipient: input.recipient,
        recipientType: input.recipientType,
        refundTo: input.refundTo,
        refundType: input.refundType,
        deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      }),
    });
    const body = await this.responseJson(response);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AppError('NEAR Intents returned an invalid quote', 502, 'INTENTS_INVALID_RESPONSE');
    }

    return body as Record<string, unknown>;
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers = new Headers(init.headers);
      if (this.apiKey) headers.set('X-API-Key', this.apiKey);

      const response = await this.fetcher(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AppError(
          `NEAR Intents request failed with status ${response.status}`,
          502,
          'INTENTS_REQUEST_FAILED',
        );
      }
      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('NEAR Intents is temporarily unavailable', 502, 'INTENTS_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async responseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new AppError(
        'NEAR Intents returned invalid JSON',
        502,
        'INTENTS_INVALID_RESPONSE',
      );
    }
  }
}
