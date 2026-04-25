import Anthropic from '@anthropic-ai/sdk';
import type { RateLimitParser } from './rate-limit-parser.js';
import type { CircuitBreaker } from './circuit-breaker.js';
import { CircuitOpenError } from './circuit-breaker.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A system prompt entry that will receive ephemeral cache control. */
export interface SystemPromptBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

/** Options for a single cached message request. */
export interface CachedMessageOptions {
  model: string;
  system?: string | SystemPromptBlock[];
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  max_tokens: number;
  temperature?: number;
}

/** Aggregated cache statistics exposed by the client. */
export interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  /** Ratio of requests that resulted in a cache read (0–1). */
  hitRate: number;
  /** Total input tokens billed (cache_creation + regular input; excludes cache_read). */
  billedInputTokens: number;
  /** Total cache-read tokens (not billed toward ITPM). */
  cacheReadTokens: number;
  /** Total cache-creation tokens. */
  cacheCreationTokens: number;
  /** Total output tokens. */
  outputTokens: number;
}

export interface PromptCachingClientOptions {
  apiKey?: string;
  rateLimitParser?: RateLimitParser;
  circuitBreaker?: CircuitBreaker;
  anthropicClient?: Anthropic;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Wraps the Anthropic Messages API with automatic prompt caching:
 *  - System prompts are converted to block form and tagged with
 *    `cache_control: { type: "ephemeral" }` on the last block.
 *  - Tool definitions each receive the same cache hint.
 *  - Cache read tokens are NOT counted toward ITPM.
 *  - Hit/miss statistics are tracked and exposed via {@link stats}.
 */
export class PromptCachingClient {
  private readonly _client: Anthropic;
  private readonly _rateLimitParser: RateLimitParser | undefined;
  private readonly _circuitBreaker: CircuitBreaker | undefined;

  private _totalRequests = 0;
  private _cacheHits = 0;
  private _billedInputTokens = 0;
  private _cacheReadTokens = 0;
  private _cacheCreationTokens = 0;
  private _outputTokens = 0;

  constructor(options: PromptCachingClientOptions = {}) {
    this._client =
      options.anthropicClient ??
      new Anthropic({ apiKey: options.apiKey });
    this._rateLimitParser = options.rateLimitParser ?? undefined;
    this._circuitBreaker = options.circuitBreaker ?? undefined;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Create a message with automatic cache control injection.
   *
   * Cache control is applied as follows:
   *  - System prompts: the final block receives `cache_control: ephemeral`.
   *  - Tools: the final tool definition receives `cache_control: ephemeral`.
   *
   * This matches Anthropic's recommended pattern for maximising cache hits.
   */
  async createMessage(
    options: CachedMessageOptions,
  ): Promise<Anthropic.Message> {
    this._circuitBreaker?.assertClosed();

    const body = this._buildRequestBody(options);

    let response: Anthropic.Message;
    try {
      response = await this._client.messages.create(body);
    } catch (err) {
      const status = this._extractStatus(err);
      this._circuitBreaker?.recordFailure(err, status);
      throw err;
    }

    // Parse rate-limit headers from the raw response if available
    if (this._rateLimitParser) {
      const raw = response as unknown as { response?: { headers?: unknown } };
      const hdrs = raw.response?.headers;
      if (hdrs && typeof (hdrs as { get?: unknown }).get === 'function') {
        this._rateLimitParser.parse(
          hdrs as { get(n: string): string | null },
        );
      }
    }

    this._circuitBreaker?.recordSuccess();
    this._accumulateStats(response);
    return response;
  }

  get stats(): CacheStats {
    return {
      totalRequests: this._totalRequests,
      cacheHits: this._cacheHits,
      hitRate:
        this._totalRequests > 0
          ? this._cacheHits / this._totalRequests
          : 0,
      billedInputTokens: this._billedInputTokens,
      cacheReadTokens: this._cacheReadTokens,
      cacheCreationTokens: this._cacheCreationTokens,
      outputTokens: this._outputTokens,
    };
  }

  resetStats(): void {
    this._totalRequests = 0;
    this._cacheHits = 0;
    this._billedInputTokens = 0;
    this._cacheReadTokens = 0;
    this._cacheCreationTokens = 0;
    this._outputTokens = 0;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _buildRequestBody(
    options: CachedMessageOptions,
  ): Anthropic.MessageCreateParamsNonStreaming {
    const body: Anthropic.MessageCreateParamsNonStreaming = {
      model: options.model,
      messages: options.messages,
      max_tokens: options.max_tokens,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    // --- System prompt ---
    if (options.system) {
      const blocks: SystemPromptBlock[] = this._toSystemBlocks(options.system);
      if (blocks.length > 0) {
        // Apply cache_control to the last block (Anthropic's recommended pattern)
        const last = blocks[blocks.length - 1];
        if (last) {
          last.cache_control = { type: 'ephemeral' };
        }
        // The SDK accepts SystemMessageParam[] which is compatible with our blocks
        body.system = blocks as unknown as Anthropic.TextBlockParam[];
      }
    }

    // --- Tools ---
    if (options.tools && options.tools.length > 0) {
      const tools = options.tools.map((t) => ({ ...t }));
      const lastTool = tools[tools.length - 1];
      if (lastTool) {
        (lastTool as unknown as { cache_control: { type: string } }).cache_control =
          { type: 'ephemeral' };
      }
      body.tools = tools;
    }

    return body;
  }

  private _toSystemBlocks(
    system: string | SystemPromptBlock[],
  ): SystemPromptBlock[] {
    if (typeof system === 'string') {
      return [{ type: 'text', text: system }];
    }
    return system.map((b) => ({ ...b }));
  }

  private _accumulateStats(msg: Anthropic.Message): void {
    this._totalRequests += 1;
    const usage = msg.usage as Anthropic.Usage & {
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };

    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheCreation = usage.cache_creation_input_tokens ?? 0;

    if (cacheRead > 0) {
      this._cacheHits += 1;
    }

    // Billed input = regular input_tokens + cache_creation (not cache_read)
    this._billedInputTokens += (usage.input_tokens ?? 0) + cacheCreation;
    this._cacheReadTokens += cacheRead;
    this._cacheCreationTokens += cacheCreation;
    this._outputTokens += usage.output_tokens ?? 0;
  }

  private _extractStatus(err: unknown): number | undefined {
    if (
      err instanceof Error &&
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number'
    ) {
      return (err as { status: number }).status;
    }
    return undefined;
  }
}
