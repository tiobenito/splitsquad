import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store';
import { computeBalances } from '../lib/balanceEngine';
import { simplifyDebts } from '../lib/debtSimplifier';
import { formatCurrency } from '../utils/money';
import { useCountUp } from '../hooks/useCountUp';
import ConfettiExplosion from 'react-confetti-explosion';
import type { Balance, Transaction } from '../types';

// ---------------------------------------------------------------------------
// Avatar colors
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-parrot-red', 'bg-parrot-blue', 'bg-orchid', 'bg-toucan-orange',
  'bg-banana', 'bg-leaf', 'bg-canopy',
];

// ---------------------------------------------------------------------------
// BalanceChart
// ---------------------------------------------------------------------------

interface BalanceChartProps {
  balances: Balance[];
  memberNameMap: Map<string, string>;
  highlightedMemberId: string | null;
  onBarClick: (memberId: string) => void;
}

function BalanceChart({
  balances,
  memberNameMap,
  highlightedMemberId,
  onBarClick,
}: BalanceChartProps) {
  const maxAbsolute = Math.max(...balances.map((b) => Math.abs(b.netCents)), 1);

  return (
    <div className="mb-6 p-4 bg-white rounded-[20px] shadow-[0_6px_20px_rgba(45,106,79,0.08)]">
      <h2 className="text-xs font-extrabold text-text-light uppercase tracking-wider mb-3">
        Balance Overview
      </h2>
      <div className="space-y-2">
        {balances.map((balance) => {
          const pct = (Math.abs(balance.netCents) / maxAbsolute) * 100;
          const isCreditor = balance.netCents > 0;
          const isHighlighted = highlightedMemberId === balance.memberId;
          const name = memberNameMap.get(balance.memberId) ?? balance.memberId;
          const amountLabel = formatCurrency(Math.abs(balance.netCents));

          return (
            <button
              key={balance.memberId}
              onClick={() => onBarClick(balance.memberId)}
              className={`w-full flex items-center gap-2 text-left rounded-xl px-2 py-1 transition-colors ${
                isHighlighted ? 'bg-leaf/10' : 'hover:bg-cream'
              }`}
              title={`${name}: ${isCreditor ? '+' : '-'}${amountLabel}`}
            >
              <span className="w-20 text-sm font-bold text-text-dark truncate shrink-0">{name}</span>
              <div className="flex-1 h-4 bg-cream rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-400 ${
                    isCreditor ? 'bg-leaf' : 'bg-gray-300'
                  }`}
                  style={{ width: `${pct}%`, transition: 'all 0.4s ease' }}
                />
              </div>
              <span
                className={`text-xs font-bold shrink-0 w-14 text-right ${
                  isCreditor ? 'text-leaf' : 'text-text-light'
                }`}
              >
                {isCreditor ? '+' : '-'}
                {amountLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PersonCard
// ---------------------------------------------------------------------------

interface PersonCardProps {
  transaction: Transaction;
  memberNameMap: Map<string, string>;
  memberIndex: number;
  isHighlighted: boolean;
  isConfirming: boolean;
  onSettleClick: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function PersonCard({
  transaction,
  memberNameMap,
  memberIndex,
  isHighlighted,
  isConfirming,
  onSettleClick,
  onConfirm,
  onCancel,
}: PersonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const animatedAmount = useCountUp(transaction.amountCents);
  const fromName = memberNameMap.get(transaction.from) ?? transaction.from;
  const toName = memberNameMap.get(transaction.to) ?? transaction.to;
  const fromInitial = fromName.charAt(0).toUpperCase();

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-[20px] py-3.5 px-4 shadow-[0_4px_16px_rgba(45,106,79,0.06)] border-l-4 border-canopy hover:translate-x-1 transition-transform ${
        isHighlighted ? 'ring-2 ring-leaf' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white shrink-0 ${AVATAR_COLORS[memberIndex % AVATAR_COLORS.length]}`}>
            {fromInitial}
          </div>
          <div>
            <p className="text-sm font-bold">
              <span>{fromName}</span> owes{' '}
              <span>{toName}</span>
            </p>
            <p className="font-display text-xl text-parrot-red">
              {formatCurrency(animatedAmount)}
            </p>
          </div>
        </div>
        {!isConfirming && (
          <button
            onClick={onSettleClick}
            className="bg-canopy hover:bg-jungle text-white font-extrabold text-xs px-4 py-2 rounded-full transition-colors shrink-0"
          >
            Settle up
          </button>
        )}
      </div>

      {isConfirming && (
        <div className="mt-2 bg-leaf/10 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-sm font-semibold">
            Settle {formatCurrency(transaction.amountCents)}?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="text-sm text-text-light hover:text-text-dark font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="text-sm text-white bg-canopy hover:bg-jungle px-3 py-1 rounded-full font-bold"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BalancesView
// ---------------------------------------------------------------------------

export default function BalancesView() {
  const { groupId } = useParams<{ groupId: string }>();
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(null);
  const [confirmingSettleId, setConfirmingSettleId] = useState<string | null>(null);
  const [settledToast, setSettledToast] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { groups, settleDebt } = useAppStore(
    useShallow((state) => ({
      groups: state.groups,
      settleDebt: state.settleDebt,
    }))
  );

  const group = groups.find((g) => g.id === groupId);

  if (!group) {
    return (
      <>
        <p className="text-text-light mb-4 font-semibold">Group not found.</p>
        <Link to="/" className="text-white/85 font-bold text-sm no-underline hover:text-white">
          Back to groups
        </Link>
      </>
    );
  }

  if (group.members.length === 0) {
    return (
      <>
        <Link to={`/groups/${group.id}`} className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5">
          &larr; Back to group
        </Link>
        <h1 className="font-display text-[2.8rem] text-white leading-none mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {group.name}
        </h1>
        <p className="text-text-light text-sm font-semibold">Add members to see balances.</p>
      </>
    );
  }

  if (group.expenses.length === 0) {
    return (
      <>
        <Link to={`/groups/${group.id}`} className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5">
          &larr; Back to group
        </Link>
        <h1 className="font-display text-[2.8rem] text-white leading-none mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {group.name}
        </h1>
        <p className="text-text-light text-sm font-semibold">Add expenses to see who owes whom.</p>
      </>
    );
  }

  const memberIds = group.members.map((m) => m.id);
  const balances = computeBalances(group.expenses, memberIds, group.settlements ?? []);
  const transactions = simplifyDebts(balances);
  const allSettled = transactions.length === 0;

  const memberNameMap = new Map<string, string>(
    group.members.map((m) => [m.id, m.name])
  );

  const handleBarClick = (memberId: string) => {
    setHighlightedMemberId((prev) => (prev === memberId ? null : memberId));
  };

  const handleSettle = (transaction: Transaction) => {
    const key = `${transaction.from}-${transaction.to}`;
    settleDebt(group.id, transaction.from, transaction.to, transaction.amountCents);
    setConfirmingSettleId(null);
    setShowConfetti(true);

    setSettledToast(key);
    setTimeout(() => setSettledToast(null), 2000);
  };

  return (
    <>
      {showConfetti && (
        <div className="flex justify-center">
          <ConfettiExplosion
            force={0.6}
            duration={2000}
            particleCount={80}
            width={400}
            onComplete={() => setShowConfetti(false)}
          />
        </div>
      )}

      <Link
        to={`/groups/${group.id}`}
        className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5"
      >
        &larr; Back to group
      </Link>

      <h1 className="font-display text-[2.8rem] text-white leading-none mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
        {group.name}
      </h1>
      <p className="text-white/80 font-bold text-sm mb-6">Balances</p>

      <BalanceChart
        balances={balances}
        memberNameMap={memberNameMap}
        highlightedMemberId={highlightedMemberId}
        onBarClick={handleBarClick}
      />

      {allSettled ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-display text-2xl mb-2">All settled up!</h2>
          <p className="text-text-light font-semibold">Everyone in {group.name} is square.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const key = `${transaction.from}-${transaction.to}`;
            const isHighlighted =
              highlightedMemberId === transaction.from ||
              highlightedMemberId === transaction.to;
            const fromIndex = group.members.findIndex(m => m.id === transaction.from);

            return (
              <div key={key}>
                <PersonCard
                  transaction={transaction}
                  memberNameMap={memberNameMap}
                  memberIndex={fromIndex >= 0 ? fromIndex : 0}
                  isHighlighted={isHighlighted}
                  isConfirming={confirmingSettleId === key}
                  onSettleClick={() => setConfirmingSettleId(key)}
                  onConfirm={() => handleSettle(transaction)}
                  onCancel={() => setConfirmingSettleId(null)}
                />
                {settledToast === key && (
                  <p className="text-leaf text-sm font-bold mt-1 pl-4">Settled! 🎉</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
