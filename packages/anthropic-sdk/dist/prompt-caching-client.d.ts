import Anthropic from '@anthropic-ai/sdk';
import type { RateLimitParser } from './rate-limit-parser.js';
import type { CircuitBreaker } from './circuit-breaker.js';
/** A system prompt entry that will receive ephemeral cache control. */
export interface SystemPromptBlock {
    type: 'text';
    text: string;
    cache_control?: {
        type: 'ephemeral';
    };
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
/**
 * Wraps the Anthropic Messages API with automatic prompt caching:
 *  - System prompts are converted to block form and tagged with
 *    `cache_control: { type: "ephemeral" }` on the last block.
 *  - Tool definitions each receive the same cache hint.
 *  - Cache read tokens are NOT counted toward ITPM.
 *  - Hit/miss statistics are tracked and exposed via {@link stats}.
 */
export declare class PromptCachingClient {
    private readonly _client;
    private readonly _rateLimitParser;
    private readonly _circuitBreaker;
    private _totalRequests;
    private _cacheHits;
    private _billedInputTokens;
    private _cacheReadTokens;
    private _cacheCreationTokens;
    private _outputTokens;
    constructor(options?: PromptCachingClientOptions);
    /**
     * Create a message with automatic cache control injection.
     *
     * Cache control is applied as follows:
     *  - System prompts: the final block receives `cache_control: ephemeral`.
     *  - Tools: the final tool definition receives `cache_control: ephemeral`.
     *
     * This matches Anthropic's recommended pattern for maximising cache hits.
     */
    createMessage(options: CachedMessageOptions): Promise<Anthropic.Message>;
    get stats(): CacheStats;
    resetStats(): void;
    private _buildRequestBody;
    private _toSystemBlocks;
    private _accumulateStats;
    private _extractStatus;
}
//# sourceMappingURL=prompt-caching-client.d.ts.map