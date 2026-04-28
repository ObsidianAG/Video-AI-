import { describe, expect, it } from 'vitest';
import { cn } from './utils.js';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('lets later tailwind classes win', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
