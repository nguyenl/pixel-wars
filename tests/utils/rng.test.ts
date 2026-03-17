import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../../src/utils/rng';

describe('mulberry32', () => {
  it('same seed produces identical sequence', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds diverge within 3 calls', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(43);
    const results1 = [rng1(), rng1(), rng1()];
    const results2 = [rng2(), rng2(), rng2()];
    const diverged = results1.some((v, i) => v !== results2[i]);
    expect(diverged).toBe(true);
  });

  it('output is always in [0, 1)', () => {
    const rng = mulberry32(99999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different values across successive calls with same seed', () => {
    const rng = mulberry32(7);
    const first = rng();
    const second = rng();
    // Should advance state on each call
    expect(first).not.toBe(second);
  });
});
