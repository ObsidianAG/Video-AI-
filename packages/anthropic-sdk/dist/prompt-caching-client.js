import Anthropic from '@anthropic-ai/sdk';
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
    _client;
    _rateLimitParser;
    _circuitBreaker;
    _totalRequests = 0;
    _cacheHits = 0;
    _billedInputTokens = 0;
    _cacheReadTokens = 0;
    _cacheCreationTokens = 0;
    _outputTokens = 0;
    constructor(options = {}) {
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
    async createMessage(options) {
        this._circuitBreaker?.assertClosed();
        const body = this._buildRequestBody(options);
        let response;
        try {
            response = await this._client.messages.create(body);
        }
        catch (err) {
            const status = this._extractStatus(err);
            this._circuitBreaker?.recordFailure(err, status);
            throw err;
        }
        // Parse rate-limit headers from the raw response if available
        if (this._rateLimitParser) {
            const raw = response;
            const hdrs = raw.response?.headers;
            if (hdrs && typeof hdrs.get === 'function') {
                this._rateLimitParser.parse(hdrs);
            }
        }
        this._circuitBreaker?.recordSuccess();
        this._accumulateStats(response);
        return response;
    }
    get stats() {
        return {
            totalRequests: this._totalRequests,
            cacheHits: this._cacheHits,
            hitRate: this._totalRequests > 0
                ? this._cacheHits / this._totalRequests
                : 0,
            billedInputTokens: this._billedInputTokens,
            cacheReadTokens: this._cacheReadTokens,
            cacheCreationTokens: this._cacheCreationTokens,
            outputTokens: this._outputTokens,
        };
    }
    resetStats() {
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
    _buildRequestBody(options) {
        const body = {
            model: options.model,
            messages: options.messages,
            max_tokens: options.max_tokens,
        };
        if (options.temperature !== undefined) {
            body.temperature = options.temperature;
        }
        // --- System prompt ---
        if (options.system) {
            const blocks = this._toSystemBlocks(options.system);
            if (blocks.length > 0) {
                // Apply cache_control to the last block (Anthropic's recommended pattern)
                const last = blocks[blocks.length - 1];
                if (last) {
                    last.cache_control = { type: 'ephemeral' };
                }
                // The SDK accepts SystemMessageParam[] which is compatible with our blocks
                body.system = blocks;
            }
        }
        // --- Tools ---
        if (options.tools && options.tools.length > 0) {
            const tools = options.tools.map((t) => ({ ...t }));
            const lastTool = tools[tools.length - 1];
            if (lastTool) {
                lastTool.cache_control =
                    { type: 'ephemeral' };
            }
            body.tools = tools;
        }
        return body;
    }
    _toSystemBlocks(system) {
        if (typeof system === 'string') {
            return [{ type: 'text', text: system }];
        }
        return system.map((b) => ({ ...b }));
    }
    _accumulateStats(msg) {
        this._totalRequests += 1;
        const usage = msg.usage;
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
    _extractStatus(err) {
        if (err instanceof Error &&
            'status' in err &&
            typeof err.status === 'number') {
            return err.status;
        }
        return undefined;
    }
}
//# sourceMappingURL=prompt-caching-client.js.map