import type { MemberMetrics } from './leaderboardEngine';

/**
 * Playful titles assigned to group members based on their spending/generosity rankings.
 * Priority order: generosity > spending > transactions.
 */
export type TitleKey =
  | 'SUGAR_PARENT'   // most generous (highest netCents)
  | 'BIGGEST_MOOCH'  // most in debt (lowest netCents)
  | 'HIGH_ROLLER'    // highest total paid
  | 'PENNY_PINCHER'  // lowest total paid
  | 'LIFE_OF_PARTY'  // most transactions paid
  | 'FREE_RIDER'     // fewest transactions
  | 'BIG_SPENDER';   // largest single expense

/** Human-readable labels for each title key. */
export const TITLE_LABELS: Record<TitleKey, string> = {
  SUGAR_PARENT:  'Sugar Daddy/Mama',
  BIGGEST_MOOCH: 'Biggest Mooch',
  HIGH_ROLLER:   'High Roller',
  PENNY_PINCHER: 'Penny Pincher',
  LIFE_OF_PARTY: 'Life of the Party',
  FREE_RIDER:    'Free Rider',
  BIG_SPENDER:   'Big Spender',
};

/**
 * Assign one playful title per member based on metric rankings.
 *
 * Rules:
 * - Requires 2+ members to rank (returns empty map for < 2)
 * - Priority order: generosity > spending > transactions > single expense
 * - First-write-wins prevents duplicates — each member gets at most one title
 * - Zero-payers are included in all sorts (a $0 payer is genuinely the Penny Pincher)
 *
 * @param metrics - Array of MemberMetrics from computeLeaderboardMetrics
 * @returns Map from memberId to TitleKey
 */
export function assignTitles(metrics: MemberMetrics[]): Map<string, TitleKey> {
  if (metrics.length < 2) return new Map();

  const titleMap = new Map<string, TitleKey>();

  // Sort arrays for each ranking dimension
  const byNet   = [...metrics].sort((a, b) => b.netCents - a.netCents);
  const byPaid  = [...metrics].sort((a, b) => b.totalPaidCents - a.totalPaidCents);
  const byCount = [...metrics].sort((a, b) => b.transactionCount - a.transactionCount);
  const byMax   = [...metrics].sort((a, b) => b.maxSingleCents - a.maxSingleCents);

  // Find the first member in a sorted array who doesn't yet have a title
  const assignFirst = (sorted: MemberMetrics[], title: TitleKey) => {
    for (const m of sorted) {
      if (!titleMap.has(m.memberId)) {
        titleMap.set(m.memberId, title);
        break;
      }
    }
  };

  // Reversed array for "lowest" titles
  const assignLast = (sorted: MemberMetrics[], title: TitleKey) => {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (!titleMap.has(sorted[i].memberId)) {
        titleMap.set(sorted[i].memberId, title);
        break;
      }
    }
  };

  // Assign in priority order: generosity first, then spending, then transactions, then single expense
  assignFirst(byNet,   'SUGAR_PARENT');
  assignLast(byNet,    'BIGGEST_MOOCH');
  assignFirst(byPaid,  'HIGH_ROLLER');
  assignLast(byPaid,   'PENNY_PINCHER');
  assignFirst(byCount, 'LIFE_OF_PARTY');
  assignLast(byCount,  'FREE_RIDER');
  assignFirst(byMax,   'BIG_SPENDER');

  return titleMap;
}
