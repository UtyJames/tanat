/**
 * Tanat — NEAR AI Cloud client.
 *
 * NEAR AI Cloud exposes an OpenAI-compatible API at https://cloud-api.near.ai/v1.
 * The API key is server-side only. Model metadata tells us whether inference
 * runs inside a TEE, so the API can label privacy tiers and refuse
 * non-confidential models for sensitive tenants.
 */

import { AppError } from '../utils/errors';

export const NEAR_AI_DEFAULT_BASE_URL = 'https://cloud-api.near.ai/v1';
export const NEAR_AI_DEFAULT_MODEL = 'z-ai/glm-5.3';

const REQUEST_TIMEOUT_MS = 30_000;
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

export type PrivacyTier = 'tee' | 'zdr' | 'standard';

export interface NearAiModel {
  id: string;
  name: string;
  contextLength: number | null;
  privacyTier: PrivacyTier;
  features: string[];
  ready: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ChatResult {
  content: string;
  toolCalls: ChatToolCall[];
  model: string;
  privacyTier: PrivacyTier;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  tools?: ChatTool[];
  maxTokens?: number;
  temperature?: number;
  /** Require a TEE-backed model. Throws if the selected model is not TEE. */
  requireTee?: boolean;
}

interface RawModel {
  id?: unknown;
  name?: unknown;
  owned_by?: unknown;
  description?: unknown;
  context_length?: unknown;
  supported_features?: unknown;
  is_ready?: unknown;
}

interface RawCompletion {
  choices?: Array<{
    message?: {
      content?: unknown;
      tool_calls?: Array<{
        id?: unknown;
        function?: { name?: unknown; arguments?: unknown };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
}

let modelCache: { expiresAt: number; models: NearAiModel[] } | null = null;

function privacyTierFor(model: RawModel): PrivacyTier {
  const ownedBy = typeof model.owned_by === 'string' ? model.owned_by : '';
  const description =
    typeof model.description === 'string' ? model.description : '';
  const text = `${ownedBy} ${description}`;

  if (/\bTEE\b|attested|confidential/i.test(text)) return 'tee';
  if (/zero data retention|\bZDR\b/i.test(text)) return 'zdr';
  return 'standard';
}

function normalizeModel(model: RawModel): NearAiModel | null {
  if (typeof model.id !== 'string' || model.id.length === 0) return null;

  return {
    id: model.id,
    name: typeof model.name === 'string' ? model.name : model.id,
    contextLength:
      typeof model.context_length === 'number' ? model.context_length : null,
    privacyTier: privacyTierFor(model),
    features: Array.isArray(model.supported_features)
      ? model.supported_features.filter(
          (value): value is string => typeof value === 'string',
        )
      : [],
    ready: model.is_ready !== false,
  };
}

export class NearAiService {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly apiKey?: string,
    fetcher: typeof fetch = fetch,
  ) {
    // The Workers runtime rejects `fetch` when it is called as an object
    // method ("Illegal invocation"). Always call it with the global receiver.
    this.fetcher = (input, init) => Reflect.apply(fetcher, globalThis, [input, init]);
  }

  get configured(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.length > 0;
  }

  async listModels(forceRefresh = false): Promise<NearAiModel[]> {
    if (
      !forceRefresh &&
      modelCache &&
      modelCache.expiresAt > Date.now()
    ) {
      return modelCache.models;
    }

    const response = await this.request('/models');
    const body = (await this.responseJson(response)) as { data?: unknown };
    if (!Array.isArray(body.data)) {
      throw new AppError(
        'NEAR AI Cloud returned an invalid model list',
        502,
        'NEAR_AI_INVALID_RESPONSE',
      );
    }

    const models = body.data
      .map((entry) => normalizeModel(entry as RawModel))
      .filter((entry): entry is NearAiModel => entry !== null);

    modelCache = { expiresAt: Date.now() + MODEL_CACHE_TTL_MS, models };
    return models;
  }

  async getModel(modelId: string): Promise<NearAiModel | null> {
    const models = await this.listModels();
    return models.find((model) => model.id === modelId) ?? null;
  }

  async chat(options: ChatOptions): Promise<ChatResult> {
    if (!this.configured) {
      throw new AppError(
        'NEAR AI Cloud is not configured',
        503,
        'NEAR_AI_NOT_CONFIGURED',
      );
    }

    const modelId = options.model || NEAR_AI_DEFAULT_MODEL;
    let privacyTier: PrivacyTier = 'standard';

    try {
      const metadata = await this.getModel(modelId);
      if (metadata) privacyTier = metadata.privacyTier;
    } catch {
      // Metadata is advisory. Chat still works if /models is unavailable.
    }

    if (options.requireTee && privacyTier !== 'tee') {
      throw new AppError(
        `Model ${modelId} is not TEE-backed and this tenant requires confidential inference`,
        403,
        'NEAR_AI_TEE_REQUIRED',
      );
    }

    const response = await this.request('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.4,
        ...(options.tools && options.tools.length > 0
          ? { tools: options.tools, tool_choice: 'auto' }
          : {}),
      }),
    });

    const body = (await this.responseJson(response)) as RawCompletion;
    const message = body.choices?.[0]?.message;
    if (!message) {
      throw new AppError(
        'NEAR AI Cloud returned an empty completion',
        502,
        'NEAR_AI_INVALID_RESPONSE',
      );
    }

    const toolCalls: ChatToolCall[] = Array.isArray(message.tool_calls)
      ? message.tool_calls
          .map((call) => {
            const name = call.function?.name;
            const args = call.function?.arguments;
            if (typeof name !== 'string') return null;
            return {
              id: typeof call.id === 'string' ? call.id : '',
              name,
              arguments: typeof args === 'string' ? args : '{}',
            };
          })
          .filter((call): call is ChatToolCall => call !== null)
      : [];

    return {
      content: typeof message.content === 'string' ? message.content : '',
      toolCalls,
      model: modelId,
      privacyTier,
      usage: {
        promptTokens:
          typeof body.usage?.prompt_tokens === 'number'
            ? body.usage.prompt_tokens
            : 0,
        completionTokens:
          typeof body.usage?.completion_tokens === 'number'
            ? body.usage.completion_tokens
            : 0,
        totalTokens:
          typeof body.usage?.total_tokens === 'number'
            ? body.usage.total_tokens
            : 0,
      },
    };
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers = new Headers(init.headers);
      if (this.apiKey) headers.set('Authorization', `Bearer ${this.apiKey}`);

      const response = await this.fetcher(`${NEAR_AI_DEFAULT_BASE_URL}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        // Do not include the upstream body: it can echo prompts or secrets.
        throw new AppError(
          `NEAR AI Cloud request failed with status ${response.status}`,
          502,
          response.status === 401 || response.status === 403
            ? 'NEAR_AI_UNAUTHORIZED'
            : 'NEAR_AI_REQUEST_FAILED',
        );
      }

      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('NEAR AI Cloud request failed', error);
      throw new AppError(
        'NEAR AI Cloud is temporarily unavailable',
        502,
        'NEAR_AI_UNAVAILABLE',
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
        'NEAR AI Cloud returned invalid JSON',
        502,
        'NEAR_AI_INVALID_RESPONSE',
      );
    }
  }
}
