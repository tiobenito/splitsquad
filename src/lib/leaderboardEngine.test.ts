import { describe, it, expect } from 'vitest';
import { computeLeaderboardMetrics } from './leaderboardEngine';
import type { Member, Expense, Balance } from '../types';

// --- helpers ---------------------------------------------------------------

function makeMember(id: string, name: string): Member {
  return { id, name };
}

function makeExpense(
  id: string,
  paidByMemberId: string,
  totalCents: number,
  splits: { memberId: string; amountCents: number }[]
): Expense {
  return {
    id,
    groupId: 'g1',
    description: 'test expense',
    totalCents,
    paidByMemberId,
    splits,
    createdAt: Date.now(),
  };
}

function makeBalance(memberId: string, netCents: number): Balance {
  return { memberId, netCents };
}

// ---------------------------------------------------------------------------

describe('computeLeaderboardMetrics', () => {
  describe('basic 3-member group', () => {
    it('returns correct totalPaidCents, transactionCount, maxSingleCents, and netCents per member', () => {
      const members = [
        makeMember('alice', 'Alice'),
        makeMember('bob', 'Bob'),
        makeMember('carol', 'Carol'),
      ];

      const expenses = [
        makeExpense('e1', 'alice', 3000, [
          { memberId: 'alice', amountCents: 1000 },
          { memberId: 'bob', amountCents: 1000 },
          { memberId: 'carol', amountCents: 1000 },
        ]),
        makeExpense('e2', 'bob', 6000, [
          { memberId: 'alice', amountCents: 2000 },
          { memberId: 'bob', amountCents: 2000 },
          { memberId: 'carol', amountCents: 2000 },
        ]),
      ];

      const balances: Balance[] = [
        makeBalance('alice', 1000),
        makeBalance('bob', 2000),
        makeBalance('carol', -3000),
      ];

      const result = computeLeaderboardMetrics(members, expenses, balances);

      expect(result).toHaveLength(3);

      const alice = result.find(m => m.memberId === 'alice')!;
      expect(alice.totalPaidCents).toBe(3000);
      expect(alice.transactionCount).toBe(1);
      expect(alice.maxSingleCents).toBe(3000);
      expect(alice.netCents).toBe(1000);

      const bob = result.find(m => m.memberId === 'bob')!;
      expect(bob.totalPaidCents).toBe(6000);
      expect(bob.transactionCount).toBe(1);
      expect(bob.maxSingleCents).toBe(6000);
      expect(bob.netCents).toBe(2000);

      const carol = result.find(m => m.memberId === 'carol')!;
      expect(carol.totalPaidCents).toBe(0);
      expect(carol.transactionCount).toBe(0);
      expect(carol.maxSingleCents).toBe(0);
      expect(carol.netCents).toBe(-3000);
    });
  });

  describe('member who paid nothing', () => {
    it('has zero spending metrics but still appears with netCents from balances', () => {
      const members = [makeMember('alice', 'Alice'), makeMember('bob', 'Bob')];

      const expenses = [
        makeExpense('e1', 'alice', 2000, [
          { memberId: 'alice', amountCents: 1000 },
          { memberId: 'bob', amountCents: 1000 },
        ]),
      ];

      const balances: Balance[] = [
        makeBalance('alice', 1000),
        makeBalance('bob', -1000),
      ];

      const result = computeLeaderboardMetrics(members, expenses, balances);

      const bob = result.find(m => m.memberId === 'bob')!;
      expect(bob.totalPaidCents).toBe(0);
      expect(bob.transactionCount).toBe(0);
      expect(bob.maxSingleCents).toBe(0);
      expect(bob.netCents).toBe(-1000);
    });
  });

  describe('empty expenses', () => {
    it('returns all-zero metrics for all members, including netCents', () => {
      const members = [makeMember('alice', 'Alice'), makeMember('bob', 'Bob')];
      const expenses: Expense[] = [];
      const balances: Balance[] = [
        makeBalance('alice', 0),
        makeBalance('bob', 0),
      ];

      const result = computeLeaderboardMetrics(members, expenses, balances);

      expect(result).toHaveLength(2);
      for (const m of result) {
        expect(m.totalPaidCents).toBe(0);
        expect(m.transactionCount).toBe(0);
        expect(m.maxSingleCents).toBe(0);
        expect(m.netCents).toBe(0);
      }
    });
  });

  describe('single expense', () => {
    it('only payer has non-zero spending metrics', () => {
      const members = [
        makeMember('alice', 'Alice'),
        makeMember('bob', 'Bob'),
        makeMember('carol', 'Carol'),
      ];

      const expenses = [
        makeExpense('e1', 'alice', 9000, [
          { memberId: 'alice', amountCents: 3000 },
          { memberId: 'bob', amountCents: 3000 },
          { memberId: 'carol', amountCents: 3000 },
        ]),
      ];

      const balances: Balance[] = [
        makeBalance('alice', 6000),
        makeBalance('bob', -3000),
        makeBalance('carol', -3000),
      ];

      const result = computeLeaderboardMetrics(members, expenses, balances);

      const alice = result.find(m => m.memberId === 'alice')!;
      expect(alice.totalPaidCents).toBe(9000);
      expect(alice.transactionCount).toBe(1);
      expect(alice.maxSingleCents).toBe(9000);

      const bob = result.find(m => m.memberId === 'bob')!;
      expect(bob.totalPaidCents).toBe(0);
      expect(bob.transactionCount).toBe(0);
      expect(bob.maxSingleCents).toBe(0);

      const carol = result.find(m => m.memberId === 'carol')!;
      expect(carol.totalPaidCents).toBe(0);
      expect(carol.transactionCount).toBe(0);
      expect(carol.maxSingleCents).toBe(0);
    });
  });

  describe('net balance integration', () => {
    it('assigns netCents correctly from pre-computed Balance[]', () => {
      const members = [makeMember('alice', 'Alice'), makeMember('bob', 'Bob')];
      const expenses: Expense[] = [];
      const balances: Balance[] = [
        makeBalance('alice', 5000),
        makeBalance('bob', -5000),
      ];

      const result = computeLeaderboardMetrics(members, expenses, balances);

      expect(result.find(m => m.memberId === 'alice')!.netCents).toBe(5000);
      expect(result.find(m => m.memberId === 'bob')!.netCents).toBe(-5000);
    });
  });

  describe('result ordering', () => {
    it('returns members in the same order as the input members array', () => {
      const members = [
        makeMember('carol', 'Carol'),
        makeMember('alice', 'Alice'),
        makeMember('bob', 'Bob'),
      ];
      const result = computeLeaderboardMetrics(members, [], [
        makeBalance('alice', 0),
        makeBalance('bob', 0),
        makeBalance('carol', 0),
      ]);

      expect(result[0].memberId).toBe('carol');
      expect(result[1].memberId).toBe('alice');
      expect(result[2].memberId).toBe('bob');
    });
  });

  describe('multiple expenses per member', () => {
    it('accumulates totalPaidCents, transactionCount across multiple expenses, and picks max for maxSingleCents', () => {
      const members = [makeMember('alice', 'Alice'), makeMember('bob', 'Bob')];

      const expenses = [
        makeExpense('e1', 'alice', 1000, [
          { memberId: 'alice', amountCents: 500 },
          { memberId: 'bob', amountCents: 500 },
        ]),
        makeExpense('e2', 'alice', 4000, [
          { memberId: 'alice', amountCents: 2000 },
          { memberId: 'bob', amountCents: 2000 },
        ]),
        makeExpense('e3', 'alice', 500, [
          { memberId: 'alice', amountCents: 250 },
          { memberId: 'bob', amountCents: 250 },
        ]),
      ];

      const result = computeLeaderboardMetrics(members, expenses, [
        makeBalance('alice', 0),
        makeBalance('bob', 0),
      ]);

      const alice = result.find(m => m.memberId === 'alice')!;
      expect(alice.totalPaidCents).toBe(5500);
      expect(alice.transactionCount).toBe(3);
      expect(alice.maxSingleCents).toBe(4000);
    });
  });
});
