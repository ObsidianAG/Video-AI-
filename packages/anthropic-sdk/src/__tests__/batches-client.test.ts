import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BatchesClient,
  BatchResultValidationError,
} from '../batches-client.js';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker.js';

// ---------------------------------------------------------------------------
// Mock Anthropic client factory
// ---------------------------------------------------------------------------

interface MockBatchStatus {
  processing_status: string;
}

function makeAnthropicMock(opts: {
  batchId?: string;
  createFail?: Error;
  retrieveStatuses?: string[];
  retrieveFail?: Error;
  results?: unknown[];
  resultsFail?: Error;
}) {
  const batchId = opts.batchId ?? 'msgbatch_test123';
  let retrieveCallCount = 0;

  return {
    beta: {
      messages: {
        batches: {
          create: opts.createFail
            ? vi.fn().mockRejectedValue(opts.createFail)
            : vi.fn().mockResolvedValue({
                id: batchId,
                processing_status: 'in_progress',
                request_counts: { processing: 1, succeeded: 0, errored: 0, canceled: 0, expired: 0 },
                ended_at: null,
                created_at: '2024-01-01T00:00:00Z',
                expires_at: '2024-01-02T00:00:00Z',
              }),
          retrieve: opts.retrieveFail
            ? vi.fn().mockRejectedValue(opts.retrieveFail)
            : vi.fn().mockImplementation((_id: string) => {
                const statuses = opts.retrieveStatuses ?? ['ended'];
                const status = statuses[Math.min(retrieveCallCount, statuses.length - 1)] ?? 'ended';
                retrieveCallCount++;
                return Promise.resolve({
                  id: batchId,
                  processing_status: status,
                });
              }),
          results: opts.resultsFail
            ? vi.fn().mockRejectedValue(opts.resultsFail)
            : vi.fn().mockResolvedValue(
                (async function* () {
                  for (const r of opts.results ?? []) {
                    yield r;
                  }
                })(),
              ),
        },
      },
    },
  };
}

function makeValidRequest(id = 'req_1') {
  return {
    custom_id: id,
    params: {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{ role: 'user' as const, content: 'Hello' }],
    },
  };
}

function makeValidResult(customId = 'req_1') {
  return {
    custom_id: customId,
    result: {
      type: 'succeeded',
      message: {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi!' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BatchesClient', () => {
  describe('createBatch', () => {
    it('creates a batch and returns the batch object', async () => {
      const mock = makeAnthropicMock({});
      const client = new BatchesClient({
        anthropicClient: mock as never,
        pollIntervalMs: 10,
      });

      const batch = await client.createBatch([makeValidRequest()]);
      expect(batch.id).toBe('msgbatch_test123');
    });

    it('throws RangeError for empty request array', async () => {
      const mock = makeAnthropicMock({});
      const client = new BatchesClient({ anthropicClient: mock as never });
      await expect(client.createBatch([])).rejects.toThrow(RangeError);
    });

    it('throws RangeError when batch exceeds MAX_BATCH_SIZE', async () => {
      const mock = makeAnthropicMock({});
      const client = new BatchesClient({ anthropicClient: mock as never });
      const requests = Array.from({ length: 100_001 }, (_, i) =>
        makeValidRequest(`req_${i}`),
      );
      await expect(client.createBatch(requests)).rejects.toThrow(RangeError);
    });

    it('throws CircuitOpenError when circuit breaker is OPEN', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      breaker.recordFailure(new Error('boom'));

      const mock = makeAnthropicMock({});
      const client = new BatchesClient({
        anthropicClient: mock as never,
        circuitBreaker: breaker,
      });

      await expect(client.createBatch([makeValidRequest()])).rejects.toThrow(
        CircuitOpenError,
      );
    });

    it('records circuit failure on API error', async () => {
      const apiError = Object.assign(new Error('network fail'), {
        status: 500,
      });
      const mock = makeAnthropicMock({ createFail: apiError });
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const client = new BatchesClient({
        anthropicClient: mock as never,
        circuitBreaker: breaker,
      });

      await expect(
        client.createBatch([makeValidRequest()]),
      ).rejects.toThrow('network fail');
      expect(breaker.failureCount).toBe(1);
    });

    it('opens circuit immediately on 429', async () => {
      const apiError = Object.assign(new Error('rate limited'), {
        status: 429,
      });
      const mock = makeAnthropicMock({ createFail: apiError });
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const client = new BatchesClient({
        anthropicClient: mock as never,
        circuitBreaker: breaker,
      });

      await expect(
        client.createBatch([makeValidRequest()]),
      ).rejects.toThrow('rate limited');
      expect(breaker.state).toBe('OPEN');
    });
  });

  describe('pollUntilComplete', () => {
    it('polls until terminal status', async () => {
      const mock = makeAnthropicMock({
        retrieveStatuses: ['in_progress', 'in_progress', 'ended'],
      });
      const client = new BatchesClient({
        anthropicClient: mock as never,
        pollIntervalMs: 10,
      });

      const result = await client.pollUntilComplete('msgbatch_test123');
      expect(result.processing_status).toBe('ended');
    });

    it('recognises all terminal statuses', async () => {
      for (const status of ['ended', 'errored', 'expired', 'canceled']) {
        const mock = makeAnthropicMock({ retrieveStatuses: [status] });
        const client = new BatchesClient({
          anthropicClient: mock as never,
          pollIntervalMs: 10,
        });
        const result = await client.pollUntilComplete('msgbatch_test123');
        expect(result.processing_status).toBe(status);
      }
    });

    it('times out if batch never completes', async () => {
      const mock = makeAnthropicMock({
        retrieveStatuses: Array(100).fill('in_progress'),
      });
      const client = new BatchesClient({
        anthropicClient: mock as never,
        pollIntervalMs: 1,
        pollTimeoutMs: 50,
      });

      await expect(
        client.pollUntilComplete('msgbatch_test123'),
      ).rejects.toThrow(/timed out/i);
    });
  });

  describe('processResults', () => {
    it('returns valid items from the results stream', async () => {
      const mock = makeAnthropicMock({
        results: [makeValidResult('req_1'), makeValidResult('req_2')],
      });
      const client = new BatchesClient({ anthropicClient: mock as never });

      const { valid, errors } = await client.processResults('msgbatch_test123');
      expect(valid).toHaveLength(2);
      expect(errors).toHaveLength(0);
      expect(valid[0]?.custom_id).toBe('req_1');
    });

    it('collects validation errors without stopping processing', async () => {
      const invalidResult = { custom_id: 'bad', result: { type: 'unknown_type' } };
      const mock = makeAnthropicMock({
        results: [makeValidResult('req_1'), invalidResult],
      });
      const client = new BatchesClient({ anthropicClient: mock as never });

      const { valid, errors } = await client.processResults('msgbatch_test123');
      expect(valid).toHaveLength(1);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(BatchResultValidationError);
    });

    it('handles errored batch results', async () => {
      const erroredResult = {
        custom_id: 'req_err',
        result: {
          type: 'errored',
          error: {
            type: 'error',
            error: { type: 'invalid_request_error', message: 'bad params' },
          },
        },
      };
      const mock = makeAnthropicMock({ results: [erroredResult] });
      const client = new BatchesClient({ anthropicClient: mock as never });

      const { valid, errors } = await client.processResults('msgbatch_test123');
      expect(valid).toHaveLength(1);
      expect(valid[0]?.result.type).toBe('errored');
      expect(errors).toHaveLength(0);
    });

    it('handles expired and canceled batch results', async () => {
      const results = [
        { custom_id: 'r1', result: { type: 'expired' } },
        { custom_id: 'r2', result: { type: 'canceled' } },
      ];
      const mock = makeAnthropicMock({ results });
      const client = new BatchesClient({ anthropicClient: mock as never });

      const { valid, errors } = await client.processResults('msgbatch_test123');
      expect(valid).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });
  });

  describe('createAndProcess', () => {
    it('creates, polls, and processes in sequence', async () => {
      const mock = makeAnthropicMock({
        retrieveStatuses: ['ended'],
        results: [makeValidResult('req_1')],
      });
      const client = new BatchesClient({
        anthropicClient: mock as never,
        pollIntervalMs: 10,
      });

      const { batch, valid, errors } = await client.createAndProcess([
        makeValidRequest('req_1'),
      ]);

      expect(batch.id).toBe('msgbatch_test123');
      expect(valid).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });
  });

  describe('BatchResultValidationError', () => {
    it('has the correct name and properties', () => {
      const { ZodError } = vi.importActual<typeof import('zod')>('zod') as typeof import('zod');
      // Use a real ZodError-like object for testing
      const mockZodError = { message: 'validation failed', issues: [] } as unknown as import('zod').ZodError;
      const err = new BatchResultValidationError(
        { custom_id: 'test' },
        mockZodError,
      );
      expect(err.name).toBe('BatchResultValidationError');
      expect(err.raw).toEqual({ custom_id: 'test' });
    });
  });
});
