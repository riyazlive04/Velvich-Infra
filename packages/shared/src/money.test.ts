import { describe, expect, it } from 'vitest';
import { collectionPercent, formatINR, paiseToRupees, rupeesToPaise, sumPaise } from './money.js';

describe('money math', () => {
  it('round-trips rupees and paise without float drift', () => {
    expect(rupeesToPaise(4500)).toBe(450000);
    expect(rupeesToPaise('₹4,500.50')).toBe(450050);
    expect(paiseToRupees(450050)).toBe(4500.5);
  });

  it('sums paise safely with null/undefined', () => {
    expect(sumPaise([100, null, 200, undefined])).toBe(300);
  });

  it('formats INR in Indian grouping', () => {
    expect(formatINR(45000000)).toBe('₹4,50,000.00');
    expect(formatINR(1200000000, { compact: true })).toBe('₹1.20Cr');
    expect(formatINR(45000000, { compact: true })).toBe('₹4.50L');
  });

  it('computes collection percent, null when no contract', () => {
    expect(collectionPercent(50000000, 100000000)).toBe(50);
    expect(collectionPercent(50000000, null)).toBeNull();
    expect(collectionPercent(50000000, 0)).toBeNull();
  });
});
