import { describe, it, expect } from 'vitest';
import { evenSplit, exactSplit, percentSplit, calculateSplits } from './splitCalculator';

describe('evenSplit', () => {
  it('2-way even split of $10 produces two $5 shares', () => {
    const splits = evenSplit(1000, ['a', 'b']);
    expect(splits).toHaveLength(2);
    expect(splits[0].amountCents).toBe(500);
    expect(splits[1].amountCents).toBe(500);
  });

  it('3-way split of $10: sums exactly to 1000 cents', () => {
    const splits = evenSplit(1000, ['a', 'b', 'c']);
    const total = splits.reduce((acc, s) => acc + s.amountCents, 0);
    expect(total).toBe(1000);
  });

  it('3-way split of $10: remainder goes to first member (334, 333, 333)', () => {
    const splits = evenSplit(1000, ['a', 'b', 'c']);
    expect(splits[0].amountCents).toBe(334);
    expect(splits[1].amountCents).toBe(333);
    expect(splits[2].amountCents).toBe(333);
  });

  it('7-way split of $10.01 sums exactly to 1001 cents', () => {
    const splits = evenSplit(1001, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const total = splits.reduce((acc, s) => acc + s.amountCents, 0);
    expect(total).toBe(1001);
  });

  it('preserves member IDs in output', () => {
    const splits = evenSplit(1000, ['alice', 'bob']);
    expect(splits[0].memberId).toBe('alice');
    expect(splits[1].memberId).toBe('bob');
  });

  it('handles single member (entire amount)', () => {
    const splits = evenSplit(1500, ['solo']);
    expect(splits).toHaveLength(1);
    expect(splits[0].amountCents).toBe(1500);
  });
});

describe('exactSplit', () => {
  it('valid exact split returns correct Split objects', () => {
    const splits = exactSplit(1000, [
      { memberId: 'a', value: 600 },
      { memberId: 'b', value: 400 },
    ]);
    expect(splits[0]).toEqual({ memberId: 'a', amountCents: 600 });
    expect(splits[1]).toEqual({ memberId: 'b', amountCents: 400 });
  });

  it('throws when exact amounts do not sum to total', () => {
    expect(() =>
      exactSplit(1000, [
        { memberId: 'a', value: 500 },
        { memberId: 'b', value: 300 },
      ])
    ).toThrow('Exact amounts must sum to total');
  });

  it('invariant: sum of valid splits always equals totalCents', () => {
    const splits = exactSplit(750, [
      { memberId: 'a', value: 250 },
      { memberId: 'b', value: 250 },
      { memberId: 'c', value: 250 },
    ]);
    const total = splits.reduce((acc, s) => acc + s.amountCents, 0);
    expect(total).toBe(750);
  });
});

describe('percentSplit', () => {
  it('50/50 split produces equal halves', () => {
    const splits = percentSplit(1000, [
      { memberId: 'a', value: 50 },
      { memberId: 'b', value: 50 },
    ]);
    expect(splits[0].amountCents).toBe(500);
    expect(splits[1].amountCents).toBe(500);
  });

  it('throws when percentages do not sum to 100', () => {
    expect(() =>
      percentSplit(1000, [
        { memberId: 'a', value: 33 },
        { memberId: 'b', value: 33 },
        { memberId: 'c', value: 33 },
      ])
    ).toThrow('Percentages must sum to 100');
  });

  it('invariant: sum of percent splits always equals totalCents', () => {
    const splits = percentSplit(1001, [
      { memberId: 'a', value: 60 },
      { memberId: 'b', value: 40 },
    ]);
    const total = splits.reduce((acc, s) => acc + s.amountCents, 0);
    expect(total).toBe(1001);
  });

  it('33/33/34 split sums to total', () => {
    const splits = percentSplit(1000, [
      { memberId: 'a', value: 33 },
      { memberId: 'b', value: 33 },
      { memberId: 'c', value: 34 },
    ]);
    const total = splits.reduce((acc, s) => acc + s.amountCents, 0);
    expect(total).toBe(1000);
  });
});

describe('calculateSplits', () => {
  it('routes to evenSplit for "even" strategy', () => {
    const splits = calculateSplits(1000, ['a', 'b'], 'even');
    expect(splits).toHaveLength(2);
    expect(splits.reduce((acc, s) => acc + s.amountCents, 0)).toBe(1000);
  });

  it('routes to exactSplit for "amount" strategy', () => {
    const splits = calculateSplits(1000, ['a', 'b'], 'amount', [
      { memberId: 'a', value: 700 },
      { memberId: 'b', value: 300 },
    ]);
    expect(splits[0].amountCents).toBe(700);
  });

  it('routes to percentSplit for "percent" strategy', () => {
    const splits = calculateSplits(1000, ['a', 'b'], 'percent', [
      { memberId: 'a', value: 60 },
      { memberId: 'b', value: 40 },
    ]);
    expect(splits[0].amountCents).toBe(600);
    expect(splits[1].amountCents).toBe(400);
  });
});
