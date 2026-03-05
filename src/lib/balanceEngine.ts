import type { Expense, Balance, Cents, Settlement } from '../types';

/**
 * Compute net balances for all members from the raw expense log.
 *
 * Algorithm:
 * - For each expense: credit payer totalCents, debit each split member their amountCents
 * - For each settlement: credit recipient (to), debit payer (from) by amountCents
 * - Balances are DERIVED on-demand — never stored in the Zustand store
 *
 * Invariant: sum(result.map(b => b.netCents)) === 0 (money is conserved)
 *
 * @param expenses    - All expenses in the group
 * @param memberIds   - All member IDs (ensures zero-balance members appear in output)
 * @param settlements - Optional settled payments (default: []). Backward-compatible with
 *                      pre-Phase 3 data via `?? []` guard.
 */
export function computeBalances(
  expenses: Expense[],
  memberIds: string[],
  settlements: Settlement[] = []
): Balance[] {
  const netMap = new Map<string, Cents>();

  // Initialize all members to 0
  for (const memberId of memberIds) {
    netMap.set(memberId, 0);
  }

  // Process each expense
  for (const expense of expenses) {
    // Credit the payer
    const payerBalance = netMap.get(expense.paidByMemberId) ?? 0;
    netMap.set(expense.paidByMemberId, payerBalance + expense.totalCents);

    // Debit each split member
    for (const split of expense.splits) {
      const memberBalance = netMap.get(split.memberId) ?? 0;
      netMap.set(split.memberId, memberBalance - split.amountCents);
    }
  }

  // Apply settlement offsets — guards against undefined pre-Phase 3 data
  for (const settlement of (settlements ?? [])) {
    // The 'from' member paid — credit them (they reduced their debt)
    const fromBalance = netMap.get(settlement.from) ?? 0;
    netMap.set(settlement.from, fromBalance + settlement.amountCents);

    // The 'to' member received payment — debit them (they received what was owed)
    const toBalance = netMap.get(settlement.to) ?? 0;
    netMap.set(settlement.to, toBalance - settlement.amountCents);
  }

  return memberIds.map(memberId => ({
    memberId,
    netCents: netMap.get(memberId) ?? 0,
  }));
}
