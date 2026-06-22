import { Link, useParams, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store';
import { computeBalances } from '../lib/balanceEngine';
import { computeLeaderboardMetrics, type MemberMetrics } from '../lib/leaderboardEngine';
import { assignTitles, TITLE_LABELS, type TitleKey } from '../lib/titleEngine';
import { useFLIP } from '../hooks/useFLIP';
import { formatCurrency } from '../utils/money';
import ScreenHeader from '../components/ScreenHeader';

// ---------------------------------------------------------------------------
// Title badge colors — jungle palette
// ---------------------------------------------------------------------------

const TITLE_COLORS: Record<TitleKey, string> = {
  SUGAR_PARENT:  'bg-orchid/20 text-orchid border-orchid/30',
  BIGGEST_MOOCH: 'bg-parrot-red/20 text-parrot-red border-parrot-red/30',
  HIGH_ROLLER:   'bg-banana/30 text-toucan-orange border-banana/50',
  PENNY_PINCHER: 'bg-gray-100 text-text-light border-gray-200',
  LIFE_OF_PARTY: 'bg-leaf/20 text-jungle border-leaf/30',
  FREE_RIDER:    'bg-toucan-orange/20 text-toucan-orange border-toucan-orange/30',
  BIG_SPENDER:   'bg-parrot-blue/20 text-parrot-blue border-parrot-blue/30',
};

// ---------------------------------------------------------------------------
// RankBadge — gold/silver/bronze for top 3
// ---------------------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: '#FFD700', color: '#5a4800' }}
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: '#C0C0C0', color: '#3a3a3a' }}
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: '#CD7F32', color: '#fff' }}
      >
        3
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-cream text-text-light">
      {rank}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TitleBadge
// ---------------------------------------------------------------------------

function TitleBadge({ titleKey }: { titleKey: TitleKey }) {
  const label = TITLE_LABELS[titleKey];
  const colorClass = TITLE_COLORS[titleKey];
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full border animate-fade-scale ${colorClass}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MiniLeaderboard
// ---------------------------------------------------------------------------

interface MiniLeaderboardProps {
  heading: string;
  emoji: string;
  sorted: MemberMetrics[];
  memberNameMap: Map<string, string>;
  titleMap: Map<string, TitleKey>;
  formatValue: (m: MemberMetrics) => string;
  setRef: (key: string) => (el: HTMLElement | null) => void;
}

function MiniLeaderboard({
  heading,
  emoji,
  sorted,
  memberNameMap,
  titleMap,
  formatValue,
  setRef,
}: MiniLeaderboardProps) {
  return (
    <section className="mb-[22px]">
      <h2 className="font-display text-lg mb-3 flex items-center gap-2">
        {emoji} {heading}
      </h2>
      <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_6px_20px_rgba(45,106,79,0.08)] divide-y divide-cream">
        {sorted.map((m, index) => {
          const name = memberNameMap.get(m.memberId) ?? m.memberId;
          const rank = index + 1;
          const titleKey = titleMap.get(m.memberId);

          return (
            <div
              key={m.memberId}
              ref={setRef(m.memberId + '-' + heading)}
              className="flex items-center gap-3 px-4 py-3"
            >
              <RankBadge rank={rank} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm truncate">{name}</span>
                  {rank === 1 && titleKey && <TitleBadge titleKey={titleKey} />}
                </div>
              </div>
              <span className="text-sm font-bold text-canopy shrink-0 tabular-nums">
                {formatValue(m)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// LeaderboardView
// ---------------------------------------------------------------------------

export default function LeaderboardView() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const groups = useAppStore(useShallow((state) => state.groups));
  const group = groups.find((g) => g.id === groupId);

  const { setRef } = useFLIP();

  if (!group) {
    return (
      <>
        <p className="text-text-light mb-4 font-semibold">Group not found.</p>
        <button
          onClick={() => navigate('/')}
          className="text-canopy font-bold text-sm hover:text-jungle"
        >
          &larr; Back to groups
        </button>
      </>
    );
  }

  if (group.members.length < 2) {
    return (
      <>
        <ScreenHeader>
          <Link
            to={`/groups/${group.id}`}
            className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5"
          >
            &larr; Back to group
          </Link>
          <h1 className="font-display text-[2.8rem] text-white leading-none mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            {group.name}
          </h1>
          <p className="text-white/80 font-bold text-sm">Leaderboard</p>
        </ScreenHeader>
        <div className="text-center py-12 bg-white rounded-[20px] shadow-[0_6px_20px_rgba(45,106,79,0.08)]">
          <p className="text-4xl mb-4 text-text-light">+</p>
          <p className="font-bold text-text-dark">Add at least 2 members to see the leaderboard</p>
          <p className="text-sm text-text-light mt-1">Rankings need at least 2 people to compare</p>
        </div>
      </>
    );
  }

  if (group.expenses.length === 0) {
    return (
      <>
        <ScreenHeader>
          <Link
            to={`/groups/${group.id}`}
            className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5"
          >
            &larr; Back to group
          </Link>
          <h1 className="font-display text-[2.8rem] text-white leading-none mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            {group.name}
          </h1>
          <p className="text-white/80 font-bold text-sm">Leaderboard</p>
        </ScreenHeader>
        <div className="text-center py-16 border-2 border-dashed border-leaf/30 rounded-[20px] bg-white/50">
          <div className="text-5xl mb-4 text-text-light font-display">#1</div>
          <h2 className="text-lg font-display mb-2">
            Your rankings await
          </h2>
          <p className="text-sm text-text-light mb-6 px-6">
            Add expenses to unlock the leaderboard and see who's the Sugar Daddy/Mama,
            the Biggest Mooch, and more.
          </p>
          <Link
            to={`/groups/${group.id}/expenses/new`}
            className="inline-block bg-gradient-to-r from-canopy to-leaf text-white font-display text-base px-6 py-3 rounded-full shadow-[0_6px_24px_rgba(64,145,108,0.25)] hover:-translate-y-0.5 transition-transform no-underline"
          >
            Add first expense
          </Link>
        </div>
      </>
    );
  }

  const memberIds = group.members.map((m) => m.id);
  const balances = computeBalances(group.expenses, memberIds, group.settlements ?? []);
  const metrics = computeLeaderboardMetrics(group.members, group.expenses, balances);
  const titleMap = assignTitles(metrics);

  const memberNameMap = new Map<string, string>(
    group.members.map((m) => [m.id, m.name])
  );

  const byTotalPaid = [...metrics].sort((a, b) => b.totalPaidCents - a.totalPaidCents);
  const byNet       = [...metrics].sort((a, b) => b.netCents - a.netCents);
  const byCount     = [...metrics].sort((a, b) => b.transactionCount - a.transactionCount);
  const byMax       = [...metrics].sort((a, b) => b.maxSingleCents - a.maxSingleCents);

  return (
    <>
      <ScreenHeader>
        <Link
          to={`/groups/${group.id}`}
          className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5"
        >
          &larr; Back to group
        </Link>

        <h1 className="font-display text-[2.8rem] text-white leading-none mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {group.name}
        </h1>
        <p className="text-white/80 font-bold text-sm">Leaderboard</p>
      </ScreenHeader>

      <MiniLeaderboard
        heading="Biggest Spender"
        emoji="💸"
        sorted={byTotalPaid}
        memberNameMap={memberNameMap}
        titleMap={titleMap}
        formatValue={(m) => formatCurrency(m.totalPaidCents)}
        setRef={setRef}
      />

      <MiniLeaderboard
        heading="Most Generous"
        emoji="🦜"
        sorted={byNet}
        memberNameMap={memberNameMap}
        titleMap={titleMap}
        formatValue={(m) =>
          m.netCents >= 0
            ? `+${formatCurrency(m.netCents)}`
            : `-${formatCurrency(Math.abs(m.netCents))}`
        }
        setRef={setRef}
      />

      <MiniLeaderboard
        heading="Most Transactions"
        emoji="🔥"
        sorted={byCount}
        memberNameMap={memberNameMap}
        titleMap={titleMap}
        formatValue={(m) =>
          m.transactionCount === 1
            ? '1 expense'
            : `${m.transactionCount} expenses`
        }
        setRef={setRef}
      />

      <MiniLeaderboard
        heading="Biggest Single Expense"
        emoji="🏆"
        sorted={byMax}
        memberNameMap={memberNameMap}
        titleMap={titleMap}
        formatValue={(m) => formatCurrency(m.maxSingleCents)}
        setRef={setRef}
      />
    </>
  );
}
