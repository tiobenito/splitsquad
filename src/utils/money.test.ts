import { describe, it, expect } from 'vitest';
import { toCents, fromCents, formatCurrency } from './money';

describe('toCents', () => {
  it('converts whole dollar amounts', () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents(1)).toBe(100);
    expect(toCents(0)).toBe(0);
  });

  it('converts fractional dollar amounts', () => {
    expect(toCents(14.50)).toBe(1450);
    expect(toCents(0.01)).toBe(1);
    expect(toCents(0.99)).toBe(99);
  });

  it('rounds floating-point imprecision correctly', () => {
    // 14.999 should round to 1500, not 1499
    expect(toCents(14.999)).toBe(1500);
    // 0.1 + 0.2 floating point issue: toCents handles via Math.round
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});

describe('fromCents', () => {
  it('converts cents to dollar number', () => {
    expect(fromCents(1450)).toBe(14.5);
    expect(fromCents(100)).toBe(1);
    expect(fromCents(1)).toBe(0.01);
    expect(fromCents(0)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats cents as USD string with 2 decimal places', () => {
    expect(formatCurrency(1450)).toBe('$14.50');
    expect(formatCurrency(1)).toBe('$0.01');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1000)).toBe('$10.00');
  });
});
