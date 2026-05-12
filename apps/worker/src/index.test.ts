import { describe, expect, it } from 'vitest';
import { bootstrap } from './index.js';

describe('worker bootstrap guard', () => {
  it('refuses to start because no queue runtime is wired', async () => {
    await expect(bootstrap()).rejects.toThrow(/Worker runtime is not wired/);
  });
});
