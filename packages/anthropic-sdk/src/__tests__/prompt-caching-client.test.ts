import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptCachingClient } from '../prompt-caching-client.js';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker.js';

// ---------------------------------------------------------------------------
// Anthropic SDK mock factory
// ---------------------------------------------------------------------------

function makeMockAnthropicClient(overrides: {
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  failWith?: Error;
}) {
  const usage = {
    input_tokens: 100,
    output_tokens: 200,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    ...overrides.usage,
  };

  return {
    messages: {
      create: overrides.failWith
        ? vi.fn().mockRejectedValue(overrides.failWith)
        : vi.fn().mockResolvedValue({
            id: 'msg_test',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: 'Hello!' }],
            model: 'claude-3-5-sonnet-20241022',
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage,
          }),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PromptCachingClient', () => {
  it('creates a message successfully and tracks stats', async () => {
    const mock = makeMockAnthropicClient({
      usage: {
        input_tokens: 100,
        output_tokens: 200,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 50,
      },
    });
    const client = new PromptCachingClient({
      anthropicClient: mock as never,
    });

    const result = await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 256,
    });

    expect(result.id).toBe('msg_test');
    expect(client.stats.totalRequests).toBe(1);
    expect(client.stats.cacheCreationTokens).toBe(50);
    expect(client.stats.outputTokens).toBe(200);
  });

  it('injects cache_control on string system prompt', async () => {
    const mock = makeMockAnthropicClient({});
    const client = new PromptCachingClient({
      anthropicClient: mock as never,
    });

    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      system: 'You are helpful.',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    });

    const callArgs = (mock.messages.create as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as { system?: unknown };
    const system = callArgs?.system as Array<{
      type: string;
      text: string;
      cache_control?: { type: string };
    }>;

    expect(Array.isArray(system)).toBe(true);
    expect(system[0]).toMatchObject({
      type: 'text',
      text: 'You are helpful.',
      cache_control: { type: 'ephemeral' },
    });
  });

  it('injects cache_control on the last block of a multi-block system prompt', async () => {
    const mock = makeMockAnthropicClient({});
    const client = new PromptCachingClient({
      anthropicClient: mock as never,
    });

    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      system: [
        { type: 'text', text: 'Block one.' },
        { type: 'text', text: 'Block two.' },
      ],
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    });

    const callArgs = (mock.messages.create as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as { system?: unknown };
    const system = callArgs?.system as Array<{
      cache_control?: { type: string };
    }>;

    expect(system[0]).not.toHaveProperty('cache_control');
    expect(system[1]).toMatchObject({ cache_control: { type: 'ephemeral' } });
  });

  it('injects cache_control on the last tool', async () => {
    const mock = makeMockAnthropicClient({});
    const client = new PromptCachingClient({
      anthropicClient: mock as never,
    });

    const tools = [
      {
        name: 'tool_a',
        description: 'Tool A',
        input_schema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'tool_b',
        description: 'Tool B',
        input_schema: { type: 'object' as const, properties: {} },
      },
    ];

    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hi' }],
      tools,
      max_tokens: 100,
    });

    const callArgs = (mock.messages.create as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as { tools?: Array<{ cache_control?: unknown }> };
    expect(callArgs.tools?.[0]).not.toHaveProperty('cache_control');
    expect(callArgs.tools?.[1]).toMatchObject({
      cache_control: { type: 'ephemeral' },
    });
  });

  it('tracks cache hit when cache_read_input_tokens > 0', async () => {
    const mock = makeMockAnthropicClient({
      usage: { cache_read_input_tokens: 5000 },
    });
    const client = new PromptCachingClient({
      anthropicClient: mock as never,
    });

    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    });

    expect(client.stats.cacheHits).toBe(1);
    expect(client.stats.hitRate).toBe(1);
    expect(client.stats.cacheReadTokens).toBe(5000);
  });

  it('tracks cache miss when cache_read_input_tokens is 0', async () => {
    const mock = makeMockAnthropicClient({
      usage: { cache_read_input_tokens: 0 },
    });
    const client = new PromptCachingClient({
      anthropicClient: mock as never,
    });

    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    });

    expect(client.stats.cacheHits).toBe(0);
    expect(client.stats.hitRate).toBe(0);
  });

  it('hitRate reflects partial cache hits across multiple requests', async () => {
    const mockHit = makeMockAnthropicClient({
      usage: { cache_read_input_tokens: 100 },
    });
    const client = new PromptCachingClient({
      anthropicClient: mockHit as never,
    });
    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    });

    // Now swap for a miss
    const mockMiss = makeMockAnthropicClient({
      usage: { cache_read_input_tokens: 0 },
    });
    (client as unknown as { _client: unknown })._client = mockMiss;
    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    });

    expect(client.stats.hitRate).toBe(0.5);
  });

  it('resetStats clears all counters', async () => {
    const mock = makeMockAnthropicClient({
      usage: { cache_read_input_tokens: 100 },
    });
    const client = new PromptCachingClient({ anthropicClient: mock as never });
    await client.createMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    });
    client.resetStats();

    expect(client.stats.totalRequests).toBe(0);
    expect(client.stats.cacheHits).toBe(0);
    expect(client.stats.hitRate).toBe(0);
  });

  it('throws when circuit breaker is OPEN', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    breaker.recordFailure(new Error('boom'));

    const client = new PromptCachingClient({
      anthropicClient: makeMockAnthropicClient({}) as never,
      circuitBreaker: breaker,
    });

    await expect(
      client.createMessage({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 100,
      }),
    ).rejects.toThrow(CircuitOpenError);
  });

  it('propagates API errors and records failure on circuit breaker', async () => {
    const apiError = Object.assign(new Error('API error'), { status: 500 });
    const mock = makeMockAnthropicClient({ failWith: apiError });
    const breaker = new CircuitBreaker({ failureThreshold: 5 });
    const client = new PromptCachingClient({
      anthropicClient: mock as never,
      circuitBreaker: breaker,
    });

    await expect(
      client.createMessage({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 100,
      }),
    ).rejects.toThrow('API error');

    expect(breaker.failureCount).toBe(1);
  });
});
