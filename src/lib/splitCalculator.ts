import type { Cents, Split, SplitInput, SplitStrategy } from '../types';

/**
 * Even split using the Largest Remainder Method.
 * Guarantees: sum(result.amountCents) === totalCents — always.
 *
 * Distributes floor(total/n) to each member, then assigns the
 * remainder cents one-by-one to the first (total % n) members.
 */
export function evenSplit(totalCents: Cents, memberIds: string[]): Split[] {
  const n = memberIds.length;
  const base = Math.floor(totalCents / n);
  const remainder = totalCents % n;
  return memberIds.map((memberId, i) => ({
    memberId,
    amountCents: base + (i < remainder ? 1 : 0),
  }));
}

/**
 * Exact-amount split. Each member's share is specified explicitly.
 * Throws if the inputs do not sum exactly to totalCents.
 */
export function exactSplit(totalCents: Cents, inputs: SplitInput[]): Split[] {
  const inputTotal = inputs.reduce((acc, i) => acc + i.value, 0);
  if (inputTotal !== totalCents) {
    throw new Error(
      `Exact amounts must sum to total: got ${inputTotal}, expected ${totalCents}`
    );
  }
  return inputs.map(({ memberId, value }) => ({ memberId, amountCents: value }));
}

/**
 * Percentage split using integer percentage points (e.g., 33 for 33%).
 * Throws if percentages do not sum to exactly 100.
 *
 * Uses Largest Remainder Method for cent distribution to guarantee
 * sum(result.amountCents) === totalCents.
 */
export function percentSplit(totalCents: Cents, inputs: SplitInput[]): Split[] {
  const percentTotal = inputs.reduce((acc, i) => acc + i.value, 0);
  if (percentTotal !== 100) {
    throw new Error(
      `Percentages must sum to 100: got ${percentTotal}`
    );
  }

  // Compute raw (fractional) cent allocation per member
  const rawAmounts = inputs.map(({ memberId, value }) => ({
    memberId,
    raw: (totalCents * value) / 100,
    floor: Math.floor((totalCents * value) / 100),
  }));

  // Distribute remainder using Largest Remainder Method
  const allocatedTotal = rawAmounts.reduce((acc, r) => acc + r.floor, 0);
  const remainder = totalCents - allocatedTotal;

  // Sort by fractional part descending to pick remainder recipients
  const sorted = rawAmounts
    .map((r, i) => ({ ...r, originalIndex: i, frac: r.raw - r.floor }))
    .sort((a, b) => b.frac - a.frac);

  const result: Split[] = rawAmounts.map(r => ({ memberId: r.memberId, amountCents: r.floor }));
  for (let i = 0; i < remainder; i++) {
    result[sorted[i].originalIndex].amountCents += 1;
  }

  return result;
}

/**
 * Strategy dispatcher — the public API of the split calculator.
 * Routes to the correct split function based on strategy.
 *
 * @param totalCents - Total expense amount in integer cents
 * @param memberIds  - Member IDs (required for 'even'; ignored for 'amount'/'percent')
 * @param strategy   - 'even' | 'amount' | 'percent'
 * @param inputs     - Required for 'amount' and 'percent' strategies
 */
export function calculateSplits(
  totalCents: Cents,
  memberIds: string[],
  strategy: SplitStrategy,
  inputs?: SplitInput[],
): Split[] {
  switch (strategy) {
    case 'even':
      return evenSplit(totalCents, memberIds);
    case 'amount':
      return exactSplit(totalCents, inputs!);
    case 'percent':
      return percentSplit(totalCents, inputs!);
  }
}
