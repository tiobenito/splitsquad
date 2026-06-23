import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store';
import { computeBalances } from '../lib/balanceEngine';
import { simplifyDebts } from '../lib/debtSimplifier';
import { computeLeaderboardMetrics } from '../lib/leaderboardEngine';
import { formatCurrency } from '../utils/money';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import type { Group } from '../types';
import ScreenHeader from '../components/ScreenHeader';

// ---------------------------------------------------------------------------
// Jungle Avatar Colors
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-parrot-red', 'bg-parrot-blue', 'bg-orchid', 'bg-toucan-orange',
  'bg-banana', 'bg-leaf', 'bg-canopy',
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getCategoryIcon(categoryValue?: string) {
  const cat = EXPENSE_CATEGORIES.find(c => c.value === categoryValue);
  return cat ? { emoji: cat.emoji, bg: cat.iconBg } : { emoji: '📦', bg: 'bg-gray-100' };
}

// ---------------------------------------------------------------------------
// LeaderboardPreviewCard
// ---------------------------------------------------------------------------

interface LeaderboardPreviewCardProps {
  group: Group;
}

function LeaderboardPreviewCard({ group }: LeaderboardPreviewCardProps) {
  let teaserText: string;

  if (group.expenses.length === 0) {
    teaserText = 'Add expenses to unlock the leaderboard!';
  } else {
    const memberIds = group.members.map((m) => m.id);
    const balances = computeBalances(group.expenses, memberIds, group.settlements ?? []);
    const metrics = computeLeaderboardMetrics(group.members, group.expenses, balances);
    const sorted = [...metrics].sort((a, b) => b.netCents - a.netCents);
    const topMemberId = sorted[0]?.memberId;
    const topMember = group.members.find((m) => m.id === topMemberId);
    const topName = topMember?.name ?? 'Someone';
    teaserText = `${topName} is the Sugar Daddy!`;
  }

  return (
    <Link
      to={`/groups/${group.id}/leaderboard`}
      className="flex items-center gap-3.5 bg-gradient-to-r from-banana to-toucan-orange rounded-3xl px-[22px] py-[18px] text-text-dark mb-[22px] shadow-[0_8px_30px_rgba(247,127,0,0.2)] hover:-translate-y-0.5 transition-transform relative overflow-hidden no-underline"
    >
      <div className="absolute -top-[30px] -right-[30px] w-[100px] h-[100px] bg-white/15 rounded-full" />
      <span className="text-[2rem]">🏆</span>
      <div className="flex-1">
        <div className="font-display text-lg">{teaserText}</div>
        <div className="text-sm opacity-70">View leaderboard &rarr;</div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canRemoveMember(group: Group, memberId: string): boolean {
  return !group.expenses.some(
    (expense) =>
      expense.paidByMemberId === memberId ||
      expense.splits.some((split) => split.memberId === memberId)
  );
}

// ---------------------------------------------------------------------------
// GroupDetailView
// ---------------------------------------------------------------------------

export default function GroupDetailView() {
  const { groupId } = useParams<{ groupId: string }>();
  const [newMemberName, setNewMemberName] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const { groups, addMember, removeMember, deleteExpense } = useAppStore(
    useShallow((state) => ({
      groups: state.groups,
      addMember: state.addMember,
      removeMember: state.removeMember,
      deleteExpense: state.deleteExpense,
    }))
  );

  const group = groups.find((g) => g.id === groupId);

  if (!group) {
    return (
      <>
        <p className="text-text-light mb-4">Group not found.</p>
        <Link to="/" className="text-canopy font-bold text-sm no-underline hover:text-jungle">
          &larr; Back to groups
        </Link>
      </>
    );
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    addMember(group.id, trimmed);
    setNewMemberName('');
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(group.id, expenseId);
    setConfirmingDeleteId(null);
  };

  // Compute stats
  const totalCents = group.expenses.reduce((sum, e) => sum + e.totalCents, 0);
  const perPersonCents = group.members.length > 0 ? Math.round(totalCents / group.members.length) : 0;

  let unsettledCount = 0;
  let transactions: ReturnType<typeof simplifyDebts> = [];
  if (group.expenses.length > 0 && group.members.length > 0) {
    const memberIds = group.members.map(m => m.id);
    const balances = computeBalances(group.expenses, memberIds, group.settlements ?? []);
    transactions = simplifyDebts(balances);
    unsettledCount = transactions.length;
  }

  const memberNameMap = new Map(group.members.map(m => [m.id, m.name]));

  return (
    <>
      <ScreenHeader>
        <Link to="/" className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5">
          &larr; My Groups
        </Link>

        <h1 className="font-display text-[2.8rem] text-white leading-none mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {group.name} 🦜
        </h1>
        <p className="text-white/80 font-bold text-sm">
          {group.members.length} friend{group.members.length !== 1 ? 's' : ''} &middot;{' '}
          {group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}
        </p>
      </ScreenHeader>

      {/* Stats Row */}
      {group.expenses.length > 0 && (
        <div className="flex gap-2.5 my-[22px]">
          <div className="flex-1 bg-white rounded-[20px] px-2.5 py-3.5 text-center shadow-[0_6px_20px_rgba(45,106,79,0.08)] border-b-4 border-parrot-red hover:-translate-y-[3px] transition-transform">
            <div className="font-display text-[1.6rem] leading-none text-parrot-red">{formatCurrency(totalCents)}</div>
            <div className="text-[0.66rem] font-extrabold uppercase tracking-wider text-text-light mt-[3px]">Total</div>
          </div>
          <div className="flex-1 bg-white rounded-[20px] px-2.5 py-3.5 text-center shadow-[0_6px_20px_rgba(45,106,79,0.08)] border-b-4 border-banana hover:-translate-y-[3px] transition-transform">
            <div className="font-display text-[1.6rem] leading-none text-toucan-orange">{formatCurrency(perPersonCents)}</div>
            <div className="text-[0.66rem] font-extrabold uppercase tracking-wider text-text-light mt-[3px]">Per Person</div>
          </div>
          <div className="flex-1 bg-white rounded-[20px] px-2.5 py-3.5 text-center shadow-[0_6px_20px_rgba(45,106,79,0.08)] border-b-4 border-leaf hover:-translate-y-[3px] transition-transform">
            <div className="font-display text-[1.6rem] leading-none text-leaf">{unsettledCount}</div>
            <div className="text-[0.66rem] font-extrabold uppercase tracking-wider text-text-light mt-[3px]">Unsettled</div>
          </div>
        </div>
      )}

      {/* Leaderboard Preview */}
      {group.members.length >= 2 && <LeaderboardPreviewCard group={group} />}

      {/* Members Section */}
      <div className="mb-[22px]">
        <div className="font-display text-lg mb-3 flex items-center gap-2">
          🐒 The Troop
        </div>

        <form onSubmit={handleAddMember} className="flex gap-2 mb-3">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Add a friend..."
            className="flex-1 bg-white rounded-full px-4 py-2.5 shadow-[0_3px_12px_rgba(45,106,79,0.06)] focus:outline-none focus:ring-2 focus:ring-leaf text-sm font-semibold"
          />
          <button
            type="submit"
            className="bg-canopy text-white font-extrabold text-xs px-4 py-2.5 rounded-full hover:bg-jungle transition-colors"
          >
            Add
          </button>
        </form>

        {group.members.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {group.members.map((member, index) => {
              const removable = canRemoveMember(group, member.id);
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 bg-white rounded-full pl-2 pr-4 py-2 shadow-[0_3px_12px_rgba(45,106,79,0.06)] hover:-translate-y-0.5 hover:-rotate-2 transition-transform"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs text-white ${getAvatarColor(index)}`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm">{member.name}</span>
                  {removable && (
                    <button
                      onClick={() => removeMember(group.id, member.id)}
                      className="text-parrot-red/50 hover:text-parrot-red text-xs font-bold ml-1 transition-colors"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Balances Preview Section */}
      {group.expenses.length > 0 && unsettledCount > 0 && (
        <div className="mb-[22px]">
          <div className="font-display text-lg mb-3 flex items-center gap-2">
            ⚖️ Who Owes Who
          </div>
          {transactions.map(t => {
            const fromName = memberNameMap.get(t.from) ?? t.from;
            const toName = memberNameMap.get(t.to) ?? t.to;
            const fromIndex = group.members.findIndex(m => m.id === t.from);

            return (
              <div
                key={`${t.from}-${t.to}`}
                className="bg-white rounded-[20px] py-3.5 px-4 mb-2.5 shadow-[0_4px_16px_rgba(45,106,79,0.06)] flex items-center gap-3 border-l-4 border-canopy hover:translate-x-1 transition-transform"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white shrink-0 ${getAvatarColor(fromIndex >= 0 ? fromIndex : 0)}`}>
                  {fromName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{fromName} &rarr; {toName}</div>
                  <div className="text-xs text-text-light">{fromName} owes {toName}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl text-parrot-red mb-1">{formatCurrency(t.amountCents)}</div>
                  <Link
                    to={`/groups/${group.id}/balances`}
                    className="bg-canopy text-white rounded-full px-4 py-1.5 font-extrabold text-xs hover:bg-jungle transition-colors inline-block no-underline"
                  >
                    Settle
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expenses Section */}
      <div className="mb-[22px]">
        <div className="font-display text-lg mb-3 flex items-center gap-2">
          🧾 Expenses
        </div>

        {group.expenses.length === 0 ? (
          <p className="text-text-light text-sm font-semibold">
            {group.members.length === 0
              ? 'Add a couple of friends above first — then log what everyone spent.'
              : 'No expenses yet. Add one below to start splitting!'}
          </p>
        ) : (
          <div>
            {group.expenses.map((expense) => {
              const paidByMember = group.members.find(m => m.id === expense.paidByMemberId);
              const { emoji, bg } = getCategoryIcon(expense.category);
              const isConfirming = confirmingDeleteId === expense.id;

              return (
                <div
                  key={expense.id}
                  className="bg-white rounded-[18px] py-3 px-4 mb-2 shadow-[0_3px_12px_rgba(0,0,0,0.04)] flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
                >
                  <div className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-xl shrink-0 ${bg}`}>
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{expense.description}</div>
                    <div className="text-xs text-text-light">
                      {paidByMember?.name ?? 'Unknown'} paid &bull;{' '}
                      {expense.splits.length > 0
                        ? expense.splits.length === group.members.length ? 'Even split' : `${expense.splits.length}-way`
                        : 'Split'}
                    </div>
                    {isConfirming && (
                      <div className="bg-parrot-red/10 rounded-xl px-3 py-2 mt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold">Delete this expense?</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setConfirmingDeleteId(null)} className="text-xs text-text-light hover:text-text-dark font-semibold">
                            Cancel
                          </button>
                          <button onClick={() => handleDeleteExpense(expense.id)} className="text-xs text-white bg-parrot-red hover:bg-parrot-red/80 px-3 py-1 rounded-full font-bold">
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display text-lg">{formatCurrency(expense.totalCents)}</span>
                    {!isConfirming && (
                      <div className="flex flex-col gap-0.5">
                        <Link
                          to={`/groups/${group.id}/expenses/${expense.id}/edit`}
                          className="text-[0.65rem] text-canopy hover:text-jungle no-underline font-bold"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setConfirmingDeleteId(expense.id)}
                          className="text-[0.65rem] text-parrot-red/50 hover:text-parrot-red font-bold"
                        >
                          Del
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Expense Button — only once there are members to split between */}
      {group.members.length > 0 && (
        <Link
          to={`/groups/${group.id}/expenses/new`}
          className="w-full bg-gradient-to-r from-canopy to-leaf text-white rounded-full py-4 font-display text-lg shadow-[0_6px_24px_rgba(64,145,108,0.25)] hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2 no-underline mt-1"
        >
          <span>+</span> Add Expense
        </Link>
      )}
    </>
  );
}
