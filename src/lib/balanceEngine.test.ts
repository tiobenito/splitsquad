import { describe, it, expect } from 'vitest';
import { computeBalances } from './balanceEngine';
import type { Expense } from '../types';

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'totalCents' | 'paidByMemberId' | 'splits'>): Expense {
  return {
    id: 'exp-1',
    groupId: 'grp-1',
    description: 'Test expense',
    category: undefined,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('computeBalances', () => {
  it('returns zero balances when no expenses', () => {
    const balances = computeBalances([], ['alice', 'bob']);
    expect(balances).toHaveLength(2);
    expect(balances.every(b => b.netCents === 0)).toBe(true);
  });

  it('credits payer and debits split members', () => {
    // Alice pays $30, even 3-way split ($10 each)
    const expense = makeExpense({
      totalCents: 3000,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 1000 },
        { memberId: 'bob', amountCents: 1000 },
        { memberId: 'carol', amountCents: 1000 },
      ],
    });

    const balances = computeBalances([expense], ['alice', 'bob', 'carol']);
    const alice = balances.find(b => b.memberId === 'alice')!;
    const bob = balances.find(b => b.memberId === 'bob')!;
    const carol = balances.find(b => b.memberId === 'carol')!;

    // Alice paid 3000, owes 1000 of own share → net +2000
    expect(alice.netCents).toBe(2000);
    // Bob and Carol each owe 1000
    expect(bob.netCents).toBe(-1000);
    expect(carol.netCents).toBe(-1000);
  });

  it('net balances sum to zero across all members', () => {
    const expense = makeExpense({
      totalCents: 1500,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 500 },
        { memberId: 'bob', amountCents: 500 },
        { memberId: 'carol', amountCents: 500 },
      ],
    });

    const balances = computeBalances([expense], ['alice', 'bob', 'carol']);
    const netTotal = balances.reduce((acc, b) => acc + b.netCents, 0);
    expect(netTotal).toBe(0);
  });

  it('accumulates balances across multiple expenses', () => {
    const exp1 = makeExpense({
      id: 'exp-1',
      totalCents: 1000,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 500 },
        { memberId: 'bob', amountCents: 500 },
      ],
    });
    const exp2 = makeExpense({
      id: 'exp-2',
      totalCents: 1000,
      paidByMemberId: 'bob',
      splits: [
        { memberId: 'alice', amountCents: 500 },
        { memberId: 'bob', amountCents: 500 },
      ],
    });

    const balances = computeBalances([exp1, exp2], ['alice', 'bob']);
    const alice = balances.find(b => b.memberId === 'alice')!;
    const bob = balances.find(b => b.memberId === 'bob')!;

    // After 2 even expenses, net should be 0 for both
    expect(alice.netCents).toBe(0);
    expect(bob.netCents).toBe(0);
  });

  it('includes members with no expenses (net 0)', () => {
    const expense = makeExpense({
      totalCents: 1000,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 500 },
        { memberId: 'bob', amountCents: 500 },
      ],
    });

    const balances = computeBalances([expense], ['alice', 'bob', 'dave']);
    const dave = balances.find(b => b.memberId === 'dave')!;
    expect(dave.netCents).toBe(0);
  });

  it('applies settlement offsets to reduce net balances', () => {
    // Alice pays $30, 3-way split ($10 each)
    const expense = makeExpense({
      totalCents: 3000,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 1000 },
        { memberId: 'bob', amountCents: 1000 },
        { memberId: 'carol', amountCents: 1000 },
      ],
    });

    // Bob pays Alice $10 to settle part of his debt
    const settlements = [
      {
        id: 'settle-1',
        groupId: 'grp-1',
        from: 'bob',
        to: 'alice',
        amountCents: 1000,
        settledAt: Date.now(),
      },
    ];

    const balances = computeBalances([expense], ['alice', 'bob', 'carol'], settlements);
    const alice = balances.find(b => b.memberId === 'alice')!;
    const bob = balances.find(b => b.memberId === 'bob')!;
    const carol = balances.find(b => b.memberId === 'carol')!;

    // Bob settled $10 → net goes from -1000 to 0
    expect(bob.netCents).toBe(0);
    // Alice received settlement → net goes from +2000 to +1000
    expect(alice.netCents).toBe(1000);
    // Carol unchanged
    expect(carol.netCents).toBe(-1000);
  });

  it('returns all-zero balances when settlements exactly cancel debts', () => {
    // Alice pays $30, 3-way split ($10 each)
    const expense = makeExpense({
      totalCents: 3000,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 1000 },
        { memberId: 'bob', amountCents: 1000 },
        { memberId: 'carol', amountCents: 1000 },
      ],
    });

    // Both Bob and Carol settle fully
    const settlements = [
      {
        id: 'settle-1',
        groupId: 'grp-1',
        from: 'bob',
        to: 'alice',
        amountCents: 1000,
        settledAt: Date.now(),
      },
      {
        id: 'settle-2',
        groupId: 'grp-1',
        from: 'carol',
        to: 'alice',
        amountCents: 1000,
        settledAt: Date.now(),
      },
    ];

    const balances = computeBalances([expense], ['alice', 'bob', 'carol'], settlements);
    const alice = balances.find(b => b.memberId === 'alice')!;
    const bob = balances.find(b => b.memberId === 'bob')!;
    const carol = balances.find(b => b.memberId === 'carol')!;

    expect(alice.netCents).toBe(0);
    expect(bob.netCents).toBe(0);
    expect(carol.netCents).toBe(0);
  });

  it('works with empty settlements array (backward compatible)', () => {
    const expense = makeExpense({
      totalCents: 3000,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 1000 },
        { memberId: 'bob', amountCents: 1000 },
        { memberId: 'carol', amountCents: 1000 },
      ],
    });

    const withSettlements = computeBalances([expense], ['alice', 'bob', 'carol'], []);
    const withoutSettlements = computeBalances([expense], ['alice', 'bob', 'carol']);

    expect(withSettlements).toEqual(withoutSettlements);
  });

  it('handles undefined settlements gracefully', () => {
    // Simulate pre-Phase 3 data by calling with undefined
    const expense = makeExpense({
      totalCents: 3000,
      paidByMemberId: 'alice',
      splits: [
        { memberId: 'alice', amountCents: 1000 },
        { memberId: 'bob', amountCents: 1000 },
        { memberId: 'carol', amountCents: 1000 },
      ],
    });

    // Should not throw
    expect(() => {
      computeBalances([expense], ['alice', 'bob', 'carol'], undefined as any);
    }).not.toThrow();

    const balances = computeBalances([expense], ['alice', 'bob', 'carol'], undefined as any);
    const alice = balances.find(b => b.memberId === 'alice')!;
    const bob = balances.find(b => b.memberId === 'bob')!;
    const carol = balances.find(b => b.memberId === 'carol')!;

    // Should return expense-only balances, no crash
    expect(alice.netCents).toBe(2000);
    expect(bob.netCents).toBe(-1000);
    expect(carol.netCents).toBe(-1000);
  });
});
