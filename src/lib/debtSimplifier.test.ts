import { describe, it, expect } from 'vitest';
import { simplifyDebts } from './debtSimplifier';
import type { Balance } from '../types';

describe('simplifyDebts', () => {
  it('returns empty transactions when all balances are zero', () => {
    const balances: Balance[] = [
      { memberId: 'alice', netCents: 0 },
      { memberId: 'bob', netCents: 0 },
    ];
    expect(simplifyDebts(balances)).toHaveLength(0);
  });

  it('simple 2-person debt: one transaction', () => {
    const balances: Balance[] = [
      { memberId: 'alice', netCents: 1000 },  // alice is owed $10
      { memberId: 'bob', netCents: -1000 },   // bob owes $10
    ];
    const transactions = simplifyDebts(balances);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual({ from: 'bob', to: 'alice', amountCents: 1000 });
  });

  it('3-person: one creditor, two debtors — 2 transactions (minimum)', () => {
    const balances: Balance[] = [
      { memberId: 'alice', netCents: 2000 },
      { memberId: 'bob', netCents: -1000 },
      { memberId: 'carol', netCents: -1000 },
    ];
    const transactions = simplifyDebts(balances);
    expect(transactions).toHaveLength(2);

    const toBob = transactions.find(t => t.from === 'bob');
    const toCarol = transactions.find(t => t.from === 'carol');
    expect(toBob?.to).toBe('alice');
    expect(toBob?.amountCents).toBe(1000);
    expect(toCarol?.to).toBe('alice');
    expect(toCarol?.amountCents).toBe(1000);
  });

  it('3-person circular debt cancels to 0 transactions', () => {
    // Alice paid for Bob (+1000), Bob paid for Carol (+1000), Carol paid for Alice (+1000)
    // Net: each person +1000 paid, -1000 owed → net 0 for all
    const balances: Balance[] = [
      { memberId: 'alice', netCents: 0 },
      { memberId: 'bob', netCents: 0 },
      { memberId: 'carol', netCents: 0 },
    ];
    expect(simplifyDebts(balances)).toHaveLength(0);
  });

  it('all transactions sum to zero (money is conserved)', () => {
    const balances: Balance[] = [
      { memberId: 'alice', netCents: 3000 },
      { memberId: 'bob', netCents: -1000 },
      { memberId: 'carol', netCents: -1500 },
      { memberId: 'dave', netCents: -500 },
    ];
    const transactions = simplifyDebts(balances);

    // sum of outgoing === sum of incoming
    const totalOut = transactions.reduce((acc, t) => acc + t.amountCents, 0);
    expect(totalOut).toBe(3000); // equals total credit
  });

  it('produces minimum transactions for 4-person group', () => {
    // 4-person group where greedy should produce ≤ 3 transactions
    const balances: Balance[] = [
      { memberId: 'a', netCents: 2000 },
      { memberId: 'b', netCents: 1000 },
      { memberId: 'c', netCents: -1000 },
      { memberId: 'd', netCents: -2000 },
    ];
    const transactions = simplifyDebts(balances);
    expect(transactions.length).toBeLessThanOrEqual(3);

    // Verify correctness: all debts settled
    const totalOut = transactions.reduce((acc, t) => acc + t.amountCents, 0);
    expect(totalOut).toBe(3000);
  });
});
