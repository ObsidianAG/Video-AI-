import { describe, expect, it } from 'vitest';
import { effectiveItpm, isDaggerModel, wouldFitItpm } from './itpm.js';

// ---------------------------------------------------------------------------
// isDaggerModel
// ---------------------------------------------------------------------------

describe('isDaggerModel', () => {
  it('returns true for claude-3-haiku (base prefix)', () => {
    expect(isDaggerModel('claude-3-haiku-20240307')).toBe(true);
  });

  it('returns true for claude-3-5-haiku (base prefix)', () => {
    expect(isDaggerModel('claude-3-5-haiku-20241022')).toBe(true);
  });

  it('returns false for claude-3-5-sonnet', () => {
    expect(isDaggerModel('claude-3-5-sonnet-20241022')).toBe(false);
  });

  it('returns false for claude-3-opus', () => {
    expect(isDaggerModel('claude-3-opus-20240229')).toBe(false);
  });

  it('returns false for claude-2', () => {
    expect(isDaggerModel('claude-2.1')).toBe(false);
  });

  it('returns false for an empty model id', () => {
    expect(isDaggerModel('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// effectiveItpm – standard models (exclude cache_read)
// ---------------------------------------------------------------------------

describe('effectiveItpm – standard models', () => {
  const model = 'claude-3-5-sonnet-20241022';

  it('returns only input_tokens when no cache_read', () => {
    expect(effectiveItpm(model, { input_tokens: 500 })).toBe(500);
  });

  it('excludes cache_read_input_tokens for standard model', () => {
    expect(
      effectiveItpm(model, {
        input_tokens: 500,
        cache_read_input_tokens: 200,
      }),
    ).toBe(500);
  });

  it('ignores cache_creation_input_tokens', () => {
    expect(
      effectiveItpm(model, {
        input_tokens: 300,
        cache_creation_input_tokens: 1000,
      }),
    ).toBe(300);
  });

  it('ignores output_tokens', () => {
    expect(
      effectiveItpm(model, {
        input_tokens: 400,
        output_tokens: 600,
      }),
    ).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// effectiveItpm – † (dagger) models (include cache_read)
// ---------------------------------------------------------------------------

describe('effectiveItpm – dagger models', () => {
  const model = 'claude-3-haiku-20240307';

  it('returns input_tokens + cache_read_input_tokens', () => {
    expect(
      effectiveItpm(model, {
        input_tokens: 500,
        cache_read_input_tokens: 200,
      }),
    ).toBe(700);
  });

  it('returns only input_tokens when cache_read is absent', () => {
    expect(effectiveItpm(model, { input_tokens: 500 })).toBe(500);
  });

  it('treats cache_read_input_tokens = 0 as zero contribution', () => {
    expect(
      effectiveItpm(model, {
        input_tokens: 500,
        cache_read_input_tokens: 0,
      }),
    ).toBe(500);
  });

  it('works for claude-3-5-haiku variant', () => {
    expect(
      effectiveItpm('claude-3-5-haiku-20241022', {
        input_tokens: 1000,
        cache_read_input_tokens: 500,
      }),
    ).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// wouldFitItpm
// ---------------------------------------------------------------------------

describe('wouldFitItpm', () => {
  it('allows request when cost ≤ remaining for standard model', () => {
    expect(wouldFitItpm('claude-3-5-sonnet-20241022', 10_000, 5_000, 4_000)).toBe(true);
  });

  it('rejects request when cost > remaining for standard model', () => {
    expect(wouldFitItpm('claude-3-5-sonnet-20241022', 10_000, 3_000, 4_000)).toBe(false);
  });

  it('includes cache_read in cost for dagger model', () => {
    // 3000 input + 2000 cache_read = 5000; remaining = 4999 → reject
    expect(wouldFitItpm('claude-3-haiku-20240307', 10_000, 4_999, 3_000, 2_000)).toBe(false);
    // 3000 + 2000 = 5000; remaining = 5000 → allow
    expect(wouldFitItpm('claude-3-haiku-20240307', 10_000, 5_000, 3_000, 2_000)).toBe(true);
  });

  it('excludes cache_read from cost for standard model even when provided', () => {
    // 3000 input; remaining = 3000; cache_read would push it over if included
    expect(wouldFitItpm('claude-3-5-sonnet-20241022', 10_000, 3_000, 3_000, 5_000)).toBe(
      true,
    );
  });
});
