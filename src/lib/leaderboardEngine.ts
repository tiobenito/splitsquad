import type { Member, Expense, Balance } from '../types';

/**
 * Per-member metrics derived on-demand from expenses and balances.
 * Consistent with the "derive on demand, never store" pattern established in Phase 1.
 */
export interface MemberMetrics {
  memberId: string;
  totalPaidCents: number;     // sum of all expenses paid by this member
  transactionCount: number;   // number of expenses paid by this member
  maxSingleCents: number;     // largest single expense paid by this member
  netCents: number;           // from Balance[] — positive = generous, negative = owes
}

/**
 * Compute leaderboard metrics for all members from raw expenses and pre-computed balances.
 *
 * Implementation:
 * - Initialize all members with zero metrics
 * - Loop expenses to accumulate spending metrics (totalPaidCents, transactionCount, maxSingleCents)
 * - Loop balances to assign netCents
 * - Return results in the same order as the input members array
 *
 * Pure function — no side effects, no store dependencies.
 */
export function computeLeaderboardMetrics(
  members: Member[],
  expenses: Expense[],
  balances: Balance[]
): MemberMetrics[] {
  const metricsMap = new Map<string, MemberMetrics>();

  // Initialize all members with zero metrics
  for (const member of members) {
    metricsMap.set(member.id, {
      memberId: member.id,
      totalPaidCents: 0,
      transactionCount: 0,
      maxSingleCents: 0,
      netCents: 0,
    });
  }

  // Accumulate spending metrics from expenses
  for (const expense of expenses) {
    const metrics = metricsMap.get(expense.paidByMemberId);
    if (!metrics) continue;
    metrics.totalPaidCents += expense.totalCents;
    metrics.transactionCount += 1;
    metrics.maxSingleCents = Math.max(metrics.maxSingleCents, expense.totalCents);
  }

  // Assign net balance from pre-computed balances
  for (const balance of balances) {
    const metrics = metricsMap.get(balance.memberId);
    if (!metrics) continue;
    metrics.netCents = balance.netCents;
  }

  // Return in the same order as the input members array
  return members.map((member) => metricsMap.get(member.id)!);
}
