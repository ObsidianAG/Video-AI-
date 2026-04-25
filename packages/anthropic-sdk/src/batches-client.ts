import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { CircuitBreaker } from './circuit-breaker.js';
import { CircuitOpenError } from './circuit-breaker.js';

// ---------------------------------------------------------------------------
// Zod schemas for batch result validation
// ---------------------------------------------------------------------------

export const BatchResultSucceededSchema = z.object({
  type: z.literal('succeeded'),
  message: z.object({
    id: z.string(),
    type: z.literal('message'),
    role: z.literal('assistant'),
    content: z.array(
      z.union([
        z.object({ type: z.literal('text'), text: z.string() }),
        z.object({
          type: z.literal('tool_use'),
          id: z.string(),
          name: z.string(),
          input: z.record(z.unknown()),
        }),
      ]),
    ),
    model: z.string(),
    stop_reason: z.string().nullable(),
    stop_sequence: z.string().nullable(),
    usage: z.object({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      cache_read_input_tokens: z.number().int().nonnegative().optional(),
      cache_creation_input_tokens: z.number().int().nonnegative().optional(),
    }),
  }),
});

export const BatchResultErroredSchema = z.object({
  type: z.literal('errored'),
  error: z.object({
    type: z.string(),
    error: z.object({
      type: z.string(),
      message: z.string(),
    }),
  }),
});

export const BatchResultExpiredSchema = z.object({
  type: z.literal('expired'),
});

export const BatchResultCanceledSchema = z.object({
  type: z.literal('canceled'),
});

export const BatchResultSchema = z.discriminatedUnion('type', [
  BatchResultSucceededSchema,
  BatchResultErroredSchema,
  BatchResultExpiredSchema,
  BatchResultCanceledSchema,
]);

export type BatchResult = z.infer<typeof BatchResultSchema>;

export const BatchResultItemSchema = z.object({
  custom_id: z.string(),
  result: BatchResultSchema,
});

export type BatchResultItem = z.infer<typeof BatchResultItemSchema>;

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

/**
 * A single request within a batch (maps to one Anthropic message request).
 */
export interface BatchRequest {
  /** Caller-assigned identifier (must be unique within the batch). */
  custom_id: string;
  params: Anthropic.MessageCreateParamsNonStreaming;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface BatchesClientOptions {
  apiKey?: string;
  circuitBreaker?: CircuitBreaker;
  anthropicClient?: Anthropic;
  /**
   * Interval in milliseconds between polling attempts.
   * @default 5_000
   */
  pollIntervalMs?: number;
  /**
   * Maximum time in milliseconds to poll before timing out.
   * @default 3_600_000 (1 hour)
   */
  pollTimeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Anthropic Message Batches client.
 *
 * Supports creating batches of up to 100,000 requests, polling until the
 * batch is complete, and processing results with Zod validation.
 */
export class BatchesClient {
  private readonly _client: Anthropic;
  private readonly _circuitBreaker: CircuitBreaker | undefined;
  private readonly _pollIntervalMs: number;
  private readonly _pollTimeoutMs: number;

  /** Maximum requests per batch (Anthropic hard limit). */
  static readonly MAX_BATCH_SIZE = 100_000;

  constructor(options: BatchesClientOptions = {}) {
    this._client =
      options.anthropicClient ?? new Anthropic({ apiKey: options.apiKey });
    this._circuitBreaker = options.circuitBreaker ?? undefined;
    this._pollIntervalMs = options.pollIntervalMs ?? 5_000;
    this._pollTimeoutMs = options.pollTimeoutMs ?? 3_600_000;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Create a new message batch.
   *
   * @param requests - Up to {@link BatchesClient.MAX_BATCH_SIZE} requests.
   * @throws {RangeError} when the request count exceeds the limit.
   */
  async createBatch(
    requests: BatchRequest[],
  ): Promise<Anthropic.Beta.Messages.BetaMessageBatch> {
    if (requests.length > BatchesClient.MAX_BATCH_SIZE) {
      throw new RangeError(
        `Batch size ${requests.length} exceeds the maximum of ${BatchesClient.MAX_BATCH_SIZE}`,
      );
    }
    if (requests.length === 0) {
      throw new RangeError('Batch must contain at least one request');
    }

    this._circuitBreaker?.assertClosed();

    try {
      const batch = await this._client.beta.messages.batches.create({
        requests: requests.map((r) => ({
          custom_id: r.custom_id,
          params: r.params,
        })),
      });
      this._circuitBreaker?.recordSuccess();
      return batch;
    } catch (err) {
      const status = this._extractStatus(err);
      this._circuitBreaker?.recordFailure(err, status);
      throw err;
    }
  }

  /**
   * Poll a batch until it reaches a terminal state (ended, errored, expired,
   * or canceled).
   *
   * @param batchId - The batch ID returned by {@link createBatch}.
   * @returns The completed batch object.
   * @throws {Error} if polling times out.
   */
  async pollUntilComplete(
    batchId: string,
  ): Promise<Anthropic.Beta.Messages.BetaMessageBatch> {
    const deadline = Date.now() + this._pollTimeoutMs;

    while (true) {
      this._circuitBreaker?.assertClosed();

      let batch: Anthropic.Beta.Messages.BetaMessageBatch;
      try {
        batch = await this._client.beta.messages.batches.retrieve(batchId);
        this._circuitBreaker?.recordSuccess();
      } catch (err) {
        const status = this._extractStatus(err);
        this._circuitBreaker?.recordFailure(err, status);
        throw err;
      }

      if (this._isTerminal(batch.processing_status)) {
        return batch;
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `Polling timed out after ${this._pollTimeoutMs}ms for batch ${batchId}`,
        );
      }

      await this._sleep(this._pollIntervalMs);
    }
  }

  /**
   * Retrieve and Zod-validate all results for a completed batch.
   *
   * Results are streamed from the Anthropic API and validated one by one.
   * Invalid items are wrapped in a {@link BatchResultValidationError} and
   * collected; they do NOT stop processing.
   *
   * @returns An object with `valid` (validated items) and `errors` (items
   *   that failed Zod validation).
   */
  async processResults(batchId: string): Promise<{
    valid: BatchResultItem[];
    errors: BatchResultValidationError[];
  }> {
    this._circuitBreaker?.assertClosed();

    const valid: BatchResultItem[] = [];
    const errors: BatchResultValidationError[] = [];

    try {
      // The SDK streams JSONL results
      for await (const result of await this._client.beta.messages.batches.results(
        batchId,
      )) {
        const parsed = BatchResultItemSchema.safeParse(result);
        if (parsed.success) {
          valid.push(parsed.data);
        } else {
          errors.push(
            new BatchResultValidationError(
              result as unknown as Record<string, unknown>,
              parsed.error,
            ),
          );
        }
      }
      this._circuitBreaker?.recordSuccess();
    } catch (err) {
      const status = this._extractStatus(err);
      this._circuitBreaker?.recordFailure(err, status);
      throw err;
    }

    return { valid, errors };
  }

  /**
   * Convenience method: create a batch, wait for it to complete, and return
   * validated results in one call.
   */
  async createAndProcess(requests: BatchRequest[]): Promise<{
    batch: Anthropic.Beta.Messages.BetaMessageBatch;
    valid: BatchResultItem[];
    errors: BatchResultValidationError[];
  }> {
    const batch = await this.createBatch(requests);
    const completed = await this.pollUntilComplete(batch.id);
    const { valid, errors } = await this.processResults(completed.id);
    return { batch: completed, valid, errors };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _isTerminal(status: string): boolean {
    return ['ended', 'errored', 'expired', 'canceled'].includes(status);
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class BatchResultValidationError extends Error {
  override readonly name = 'BatchResultValidationError';
  readonly raw: Record<string, unknown>;
  readonly zodError: z.ZodError;

  constructor(raw: Record<string, unknown>, zodError: z.ZodError) {
    super(`Batch result failed Zod validation: ${zodError.message}`);
    this.raw = raw;
    this.zodError = zodError;
  }
}

export { CircuitOpenError };
