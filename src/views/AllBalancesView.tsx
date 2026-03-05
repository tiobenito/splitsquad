import { Link } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store';
import { computeBalances } from '../lib/balanceEngine';
import { formatCurrency } from '../utils/money';
import { useCountUp } from '../hooks/useCountUp';
import type { Group } from '../types';

// ---------------------------------------------------------------------------
// Avatar colors
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-parrot-red', 'bg-parrot-blue', 'bg-orchid', 'bg-toucan-orange',
  'bg-banana', 'bg-leaf', 'bg-canopy',
];

// ---------------------------------------------------------------------------
// Cross-group balance computation
// ---------------------------------------------------------------------------

interface AllGroupsBalance {
  memberId: string;
  name: string;
  netCents: number;
}

function computeAllGroupsBalances(groups: Group[]): AllGroupsBalance[] {
  const memberNameMap = new Map<string, string>();
  const totals = new Map<string, number>();

  for (const group of groups) {
    for (const member of group.members) {
      memberNameMap.set(member.id, member.name);
    }

    const balances = computeBalances(
      group.expenses,
      group.members.map((m) => m.id),
      group.settlements ?? []
    );

    for (const balance of balances) {
      totals.set(balance.memberId, (totals.get(balance.memberId) ?? 0) + balance.netCents);
    }
  }

  return Array.from(totals.entries())
    .map(([memberId, netCents]) => ({
      memberId,
      name: memberNameMap.get(memberId) ?? 'Unknown',
      netCents,
    }))
    .filter((b) => b.netCents !== 0)
    .sort((a, b) => b.netCents - a.netCents);
}

// ---------------------------------------------------------------------------
// PersonBalanceCard
// ---------------------------------------------------------------------------

interface PersonBalanceCardProps {
  balance: AllGroupsBalance;
  index: number;
}

function PersonBalanceCard({ balance, index }: PersonBalanceCardProps) {
  const animatedAmount = useCountUp(Math.abs(balance.netCents));
  const isCreditor = balance.netCents > 0;
  const initial = balance.name.charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-[20px] py-3.5 px-4 shadow-[0_4px_16px_rgba(45,106,79,0.06)] flex items-center justify-between gap-3 border-l-4 border-canopy">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white shrink-0 ${
            AVATAR_COLORS[index % AVATAR_COLORS.length]
          }`}
        >
          {initial}
        </div>
        <div>
          <p className="font-bold text-sm">{balance.name}</p>
          <p className={`text-xs ${isCreditor ? 'text-leaf' : 'text-text-light'}`}>
            {isCreditor
              ? `is owed ${formatCurrency(animatedAmount)}`
              : `owes ${formatCurrency(animatedAmount)}`}
          </p>
        </div>
      </div>
      <span
        className={`font-display text-xl shrink-0 ${
          isCreditor ? 'text-leaf' : 'text-parrot-red'
        }`}
      >
        {isCreditor ? '+' : '-'}
        {formatCurrency(animatedAmount)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AllBalancesView
// ---------------------------------------------------------------------------

export default function AllBalancesView() {
  const { groups } = useAppStore(useShallow((state) => ({ groups: state.groups })));

  const hasAnyExpenses = groups.some((g) => g.expenses.length > 0);

  if (groups.length === 0 || !hasAnyExpenses) {
    return (
      <>
        <Link to="/" className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5">
          &larr; Back to groups
        </Link>
        <h1 className="font-display text-[2.8rem] text-white leading-none mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          All Balances
        </h1>
        <p className="text-text-light text-center mt-12 font-semibold">No expenses across any group yet.</p>
      </>
    );
  }

  const allBalances = computeAllGroupsBalances(groups);
  const allSettled = allBalances.length === 0;

  const maxAbsolute = Math.max(...allBalances.map((b) => Math.abs(b.netCents)), 1);

  return (
    <>
      <Link to="/" className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5">
        &larr; Back to groups
      </Link>

      <h1 className="font-display text-[2.8rem] text-white leading-none mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
        All Balances
      </h1>
      <p className="text-white/80 font-bold text-sm mb-6">Across all groups</p>

      {allSettled ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-display text-2xl mb-2">All settled across all groups!</h2>
          <p className="text-text-light font-semibold">Every balance across every group is zero.</p>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="mb-6 p-4 bg-white rounded-[20px] shadow-[0_6px_20px_rgba(45,106,79,0.08)]">
            <h2 className="text-xs font-extrabold text-text-light uppercase tracking-wider mb-3">
              Cross-Group Overview
            </h2>
            <div className="space-y-2">
              {allBalances.map((balance) => {
                const pct = (Math.abs(balance.netCents) / maxAbsolute) * 100;
                const isCreditor = balance.netCents > 0;

                return (
                  <div key={balance.memberId} className="flex items-center gap-2">
                    <span className="w-20 text-sm font-bold text-text-dark truncate shrink-0">
                      {balance.name}
                    </span>
                    <div className="flex-1 h-4 bg-cream rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isCreditor ? 'bg-leaf' : 'bg-gray-300'}`}
                        style={{ width: `${pct}%`, transition: 'all 0.4s ease' }}
                      />
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 w-14 text-right ${
                        isCreditor ? 'text-leaf' : 'text-text-light'
                      }`}
                    >
                      {isCreditor ? '+' : '-'}
                      {formatCurrency(Math.abs(balance.netCents))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Person summary cards */}
          <div className="space-y-3">
            {allBalances.map((balance, index) => (
              <PersonBalanceCard key={balance.memberId} balance={balance} index={index} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
