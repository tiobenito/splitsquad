import { useState } from 'react';
import { Link } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store';
import ScreenHeader from '../components/ScreenHeader';

export default function GroupListView() {
  const [newGroupName, setNewGroupName] = useState('');
  const { groups, addGroup } = useAppStore(
    useShallow((state) => ({
      groups: state.groups,
      addGroup: state.addGroup,
    }))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    addGroup(trimmed);
    setNewGroupName('');
  };

  const sortedGroups = [...groups].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <ScreenHeader>
        <h1 className="font-display text-[2.8rem] text-white leading-none mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          SplitSquad 🦜
        </h1>
        <p className="text-white/90 font-bold text-sm leading-snug">
          Split shared expenses with friends.
        </p>
        {groups.length > 0 && (
          <p className="text-white/70 font-bold text-xs mt-1">
            {groups.length} group{groups.length !== 1 ? 's' : ''}
          </p>
        )}

        {groups.some((g) => g.expenses.length > 0) && (
          <Link
            to="/balances"
            className="inline-block mt-3 text-white/85 font-bold text-sm no-underline hover:text-white transition-colors"
          >
            View all balances across groups &rarr;
          </Link>
        )}
      </ScreenHeader>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name..."
          className="flex-1 bg-white rounded-full px-4 py-3 shadow-[0_6px_20px_rgba(45,106,79,0.08)] focus:outline-none focus:ring-2 focus:ring-leaf font-semibold text-sm"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-canopy to-leaf text-white font-display text-lg px-6 py-3 rounded-full shadow-[0_6px_24px_rgba(64,145,108,0.25)] hover:-translate-y-0.5 transition-transform"
        >
          Create
        </button>
      </form>

      {sortedGroups.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-display text-2xl text-text-dark">Start with a group 🌴</p>
          <p className="text-text-light text-sm font-semibold mt-1 mb-7">
            A trip, a house, a dinner — anything you share costs on. Name it above and hit Create.
          </p>
          <div className="grid grid-cols-3 gap-3 text-left">
            {[
              { n: '1', t: 'Create a group', e: '🌴' },
              { n: '2', t: 'Add your friends', e: '🐒' },
              { n: '3', t: 'Log expenses — we tally who owes who', e: '🧾' },
            ].map((s) => (
              <div key={s.n} className="bg-white rounded-[18px] p-4 shadow-[0_4px_16px_rgba(45,106,79,0.06)]">
                <div className="text-2xl mb-2">{s.e}</div>
                <div className="font-display text-canopy text-lg leading-none mb-1">Step {s.n}</div>
                <div className="text-xs text-text-light font-semibold leading-snug">{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedGroups.map((group) => (
            <li key={group.id}>
              <Link
                to={`/groups/${group.id}`}
                className="block bg-white rounded-[20px] p-4 shadow-[0_6px_20px_rgba(45,106,79,0.08)] hover:-translate-y-[3px] transition-transform no-underline"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl text-text-dark">{group.name}</span>
                  <span className="text-xs text-text-light font-bold">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 text-sm text-text-light font-semibold">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''} &middot;{' '}
                  {group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
