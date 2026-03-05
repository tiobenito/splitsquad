import type { Balance, Transaction, Cents } from '../types';

/**
 * Greedy debt simplification — produces the minimum number of transactions
 * to settle all debts in a group.
 *
 * Algorithm:
 * 1. Separate members into creditors (positive net) and debtors (negative net)
 * 2. Sort creditors descending, debtors by magnitude descending
 * 3. Greedily match largest creditor with largest debtor each iteration
 * 4. Repeat until all debts resolved
 *
 * Complexity: O(n log n) — correct and efficient for friend groups (n < 20)
 * Note: Not globally optimal (NP-complete), but near-optimal for small n.
 *
 * @param balances - Output of computeBalances()
 */
export function simplifyDebts(balances: Balance[]): Transaction[] {
  // Build mutable arrays of [memberId, netCents] pairs
  const creditors: [string, Cents][] = balances
    .filter(b => b.netCents > 0)
    .map(b => [b.memberId, b.netCents] as [string, Cents])
    .sort(([, a], [, b]) => b - a);  // largest credit first

  const debtors: [string, Cents][] = balances
    .filter(b => b.netCents < 0)
    .map(b => [b.memberId, b.netCents] as [string, Cents])
    .sort(([, a], [, b]) => a - b);  // most negative (largest debt) first

  const transactions: Transaction[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const [creditorId, credit] = creditors[ci];
    const [debtorId, debt] = debtors[di];
    const amount = Math.min(credit, -debt);

    transactions.push({
      from: debtorId,
      to: creditorId,
      amountCents: amount,
    });

    creditors[ci][1] -= amount;
    debtors[di][1] += amount;

    if (creditors[ci][1] === 0) ci++;
    if (debtors[di][1] === 0) di++;
  }

  return transactions;
}
