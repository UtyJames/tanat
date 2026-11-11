/**
 * Tanat — NEAR Intents (1Click) client.
 *
 * 1Click turns a cross-chain transfer into a deposit address plus an
 * intent that solvers execute. Tanat never holds funds: the payer sends to
 * the quote's deposit address and 1Click settles on the destination chain.
 *
 * Docs: https://docs.near-intents.org/integration/distribution-channels/1click-api
 */

import { AppError } from '../utils/errors';

const API_BASE_URL = 'https://1click.chaindefuser.com/v0';
const REQUEST_TIMEOUT_MS = 15_000;

export interface IntentsQuoteRequest {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS';
  refundTo: string;
  refundType: 'ORIGIN_CHAIN' | 'INTENTS';
  slippageTolerance: number;
  /** dry=true validates only; dry=false returns a deposit address. */
  dry?: boolean;
  deadline?: string;
}

export interface IntentsToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
}

export interface IntentsQuote {
  quoteId: string | null;
  depositAddress: string | null;
  amountIn: string;
  amountInFormatted: string;
  amountInUsd: string | null;
  amountOut: string;
  amountOutFormatted: string;
  amountOutUsd: string | null;
  minAmountOut: string | null;
  timeEstimate: number | null;
  deadline: string | null;
  raw: Record<string, unknown>;
}

export interface IntentsStatus {
  status: string;
  updatedAt: string | null;
  swapDetails: Record<string, unknown> | null;
  raw: Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export class NearIntentsService {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly apiKey?: string,
    fetcher: typeof fetch = fetch,
  ) {
    // The Workers runtime rejects `fetch` when it is called as an object
    // method ("Illegal invocation"). Always call it with the global receiver.
    this.fetcher = (input, init) => Reflect.apply(fetcher, globalThis, [input, init]);
  }

  async listTokens(): Promise<IntentsToken[]> {
    const response = await this.request(`${API_BASE_URL}/tokens`);
    const body = await this.responseJson(response);
    if (!Array.isArray(body)) {
      throw new AppError(
        'NEAR Intents returned an invalid token list',
        502,
        'INTENTS_INVALID_RESPONSE',
      );
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
        throw new AppError(
          'NEAR Intents returned an invalid token entry',
          502,
          'INTENTS_INVALID_RESPONSE',
        );
      }

      return {
        assetId: token.assetId,
        decimals: token.decimals,
        blockchain: token.blockchain,
        symbol: token.symbol,
      };
    });
  }

  /**
   * Request a quote. Use dry=true for a preview; dry=false to create the
   * deposit address a payer can fund.
   */
  async requestQuote(input: IntentsQuoteRequest): Promise<IntentsQuote> {
    const deadline =
      input.deadline ?? new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const response = await this.request(`${API_BASE_URL}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dry: input.dry ?? true,
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
        deadline,
      }),
    });

    return this.normalizeQuote(await this.responseJson(response));
  }

  /** Backwards-compatible dry quote used by the preview endpoint. */
  async requestDryQuote(input: IntentsQuoteRequest): Promise<IntentsQuote> {
    return this.requestQuote({ ...input, dry: true });
  }

  async getStatus(depositAddress: string): Promise<IntentsStatus> {
    const response = await this.request(
      `${API_BASE_URL}/status?depositAddress=${encodeURIComponent(depositAddress)}`,
    );
    const body = await this.responseJson(response);
    const record = asObject(body);
    if (!record) {
      throw new AppError(
        'NEAR Intents returned an invalid status',
        502,
        'INTENTS_INVALID_RESPONSE',
      );
    }

    return {
      status: asString(record.status) ?? 'UNKNOWN',
      updatedAt: asString(record.updatedAt) ?? asString(record.updated_at),
      swapDetails: asObject(record.swapDetails),
      raw: record,
    };
  }

  async submitDeposit(depositAddress: string, txHash: string): Promise<void> {
    await this.request(`${API_BASE_URL}/deposit/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositAddress, txHash }),
    });
  }

  private normalizeQuote(body: unknown): IntentsQuote {
    const record = asObject(body);
    if (!record) {
      throw new AppError(
        'NEAR Intents returned an invalid quote',
        502,
        'INTENTS_INVALID_RESPONSE',
      );
    }

    const quote = asObject(record.quote) ?? {};

    return {
      quoteId: asString(record.quoteId) ?? asString(record.correlationId),
      depositAddress: asString(quote.depositAddress),
      amountIn: asString(quote.amountIn) ?? '0',
      amountInFormatted: asString(quote.amountInFormatted) ?? '0',
      amountInUsd: asString(quote.amountInUsd),
      amountOut: asString(quote.amountOut) ?? '0',
      amountOutFormatted: asString(quote.amountOutFormatted) ?? '0',
      amountOutUsd: asString(quote.amountOutUsd),
      minAmountOut: asString(quote.minAmountOut),
      timeEstimate: asNumber(quote.timeEstimate),
      deadline: asString(quote.deadline),
      raw: record,
    };
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers = new Headers(init.headers);
      // 1Click uses a JWT bearer token when a partner key is configured.
      if (this.apiKey) headers.set('Authorization', `Bearer ${this.apiKey}`);

      const response = await this.fetcher(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        // 1Click returns a short validation message (for example, an invalid
        // recipient address). Surface it so callers can fix their request.
        let detail = '';
        try {
          const body = (await response.json()) as { message?: unknown };
          if (typeof body.message === 'string' && body.message.length > 0) {
            detail = `: ${body.message.slice(0, 200)}`;
          }
        } catch {
          // No usable body; keep the status-only message.
        }

        throw new AppError(
          `NEAR Intents request failed with status ${response.status}${detail}`,
          response.status >= 400 && response.status < 500 ? 400 : 502,
          'INTENTS_REQUEST_FAILED',
        );
      }
      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('NEAR Intents request failed', error);
      throw new AppError(
        'NEAR Intents is temporarily unavailable',
        502,
        'INTENTS_UNAVAILABLE',
      );
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
