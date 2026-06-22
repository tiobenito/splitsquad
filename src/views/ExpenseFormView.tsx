import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store';
import { calculateSplits, evenSplit } from '../lib/splitCalculator';
import { toCents, formatCurrency } from '../utils/money';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import ScreenHeader from '../components/ScreenHeader';

type SplitMode = 'even' | 'amount' | 'percent';

interface MemberSplitInput {
  memberId: string;
  value: string;
}

export default function ExpenseFormView() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();

  const { groups, addExpense, updateExpense } = useAppStore(
    useShallow((state) => ({
      groups: state.groups,
      addExpense: state.addExpense,
      updateExpense: state.updateExpense,
    }))
  );

  const group = groups.find((g) => g.id === groupId);
  const existingExpense = expenseId
    ? group?.expenses.find((e) => e.id === expenseId)
    : undefined;
  const isEditMode = Boolean(expenseId);

  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('even');
  const [memberSplits, setMemberSplits] = useState<MemberSplitInput[]>([]);
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmountInput((existingExpense.totalCents / 100).toFixed(2));
      setPaidByMemberId(existingExpense.paidByMemberId);
      setCategory(existingExpense.category ?? '');

      const n = existingExpense.splits.length;
      if (n > 0) {
        const baseAmount = Math.floor(existingExpense.totalCents / n);
        const allEqual = existingExpense.splits.every(
          (s) => s.amountCents === baseAmount || s.amountCents === baseAmount + 1
        );
        if (allEqual) {
          setSplitMode('even');
        } else {
          setSplitMode('amount');
          setMemberSplits(
            existingExpense.splits.map((s) => ({
              memberId: s.memberId,
              value: (s.amountCents / 100).toFixed(2),
            }))
          );
        }
      }
    }
  }, [existingExpense?.id]);

  useEffect(() => {
    if (!group) return;
    setMemberSplits((prev) => {
      const existing = new Map(prev.map((s) => [s.memberId, s.value]));
      return group.members.map((m) => ({
        memberId: m.id,
        value: existing.get(m.id) ?? '',
      }));
    });
  }, [group?.members.length, splitMode]);

  const evenSplitPreview =
    splitMode === 'even' && amountInput && !isNaN(parseFloat(amountInput)) && group && group.members.length > 0
      ? evenSplit(toCents(parseFloat(amountInput)), group.members.map((m) => m.id))
      : null;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    const parsedAmount = parseFloat(amountInput);
    if (!amountInput || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Enter a valid amount greater than $0';
    }

    if (!paidByMemberId) {
      newErrors.payer = 'Select who paid';
    }

    if (splitMode === 'amount') {
      const totalCents = toCents(parsedAmount || 0);
      const sum = memberSplits.reduce(
        (acc, s) => acc + toCents(parseFloat(s.value || '0')),
        0
      );
      if (sum !== totalCents) {
        newErrors.splits = `Amounts must add up to ${formatCurrency(totalCents)} (currently ${formatCurrency(sum)})`;
      }
    }

    if (splitMode === 'percent') {
      const sum = memberSplits.reduce(
        (acc, s) => acc + parseInt(s.value || '0', 10),
        0
      );
      if (sum !== 100) {
        newErrors.splits = `Percentages must add up to 100% (currently ${sum}%)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const totalCents = toCents(parseFloat(amountInput));
    const memberIds = group!.members.map((m) => m.id);

    let splits;
    if (splitMode === 'even') {
      splits = calculateSplits(totalCents, memberIds, 'even');
    } else if (splitMode === 'amount') {
      const inputs = memberSplits.map((s) => ({
        memberId: s.memberId,
        value: toCents(parseFloat(s.value)),
      }));
      splits = calculateSplits(totalCents, memberIds, 'amount', inputs);
    } else {
      const inputs = memberSplits.map((s) => ({
        memberId: s.memberId,
        value: parseInt(s.value, 10),
      }));
      splits = calculateSplits(totalCents, memberIds, 'percent', inputs);
    }

    const expenseData = {
      description: description.trim(),
      totalCents,
      paidByMemberId,
      splits,
      category: category || undefined,
    };

    if (existingExpense) {
      updateExpense(groupId!, existingExpense.id, expenseData);
    } else {
      addExpense(groupId!, expenseData);
    }

    navigate(`/groups/${groupId}`);
  }

  if (!group) {
    return (
      <>
        <p className="text-parrot-red mb-4 font-semibold">Group not found.</p>
        <Link to="/" className="text-canopy font-bold text-sm no-underline hover:text-jungle">
          &larr; Back to groups
        </Link>
      </>
    );
  }

  if (isEditMode && !existingExpense) {
    return (
      <>
        <p className="text-parrot-red mb-4 font-semibold">Expense not found.</p>
        <Link to={`/groups/${groupId}`} className="text-canopy font-bold text-sm no-underline hover:text-jungle">
          &larr; Back to group
        </Link>
      </>
    );
  }

  const parsedAmount = parseFloat(amountInput);
  const totalCentsPreview = amountInput && !isNaN(parsedAmount) ? toCents(parsedAmount) : 0;

  const amountSplitSum = memberSplits.reduce(
    (acc, s) => acc + toCents(parseFloat(s.value || '0')),
    0
  );
  const percentSplitSum = memberSplits.reduce(
    (acc, s) => acc + parseInt(s.value || '0', 10),
    0
  );

  const isFormInvalid = !description.trim() || !amountInput || !paidByMemberId;

  return (
    <>
      <ScreenHeader>
        <Link to={`/groups/${groupId}`} className="text-white/85 font-bold text-sm no-underline hover:text-white inline-block mb-3.5">
          &larr; Back to {group.name}
        </Link>

        <h1 className="font-display text-[2.8rem] text-white leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          {isEditMode ? 'Edit Expense' : 'Add Expense'}
        </h1>
      </ScreenHeader>

      <form onSubmit={handleSubmit}>
        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1.5" htmlFor="description">
            Description
          </label>
          <input
            id="description"
            type="text"
            className="w-full bg-white rounded-2xl px-4 py-3 shadow-[0_3px_12px_rgba(45,106,79,0.06)] focus:outline-none focus:ring-2 focus:ring-leaf font-semibold text-sm"
            placeholder="What was this expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {errors.description && (
            <p className="text-parrot-red text-sm mt-1 font-semibold">{errors.description}</p>
          )}
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1.5" htmlFor="amount">
            Amount
          </label>
          <div className="flex items-center bg-white rounded-2xl shadow-[0_3px_12px_rgba(45,106,79,0.06)] focus-within:ring-2 focus-within:ring-leaf overflow-hidden">
            <span className="px-4 py-3 text-text-light bg-leaf/10 font-bold">
              $
            </span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="flex-1 px-3 py-3 focus:outline-none font-semibold text-sm bg-transparent"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
          {errors.amount && (
            <p className="text-parrot-red text-sm mt-1 font-semibold">{errors.amount}</p>
          )}
        </div>

        {/* Payer */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1.5" htmlFor="payer">
            Who paid?
          </label>
          <select
            id="payer"
            className="w-full bg-white rounded-2xl px-4 py-3 shadow-[0_3px_12px_rgba(45,106,79,0.06)] focus:outline-none focus:ring-2 focus:ring-leaf font-semibold text-sm appearance-none"
            value={paidByMemberId}
            onChange={(e) => setPaidByMemberId(e.target.value)}
          >
            <option value="">Select payer...</option>
            {group.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {errors.payer && (
            <p className="text-parrot-red text-sm mt-1 font-semibold">{errors.payer}</p>
          )}
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1.5">
            Category <span className="text-text-light font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                  category === cat.value
                    ? 'bg-canopy text-white shadow-[0_3px_12px_rgba(64,145,108,0.3)]'
                    : 'bg-white text-text-dark shadow-[0_2px_8px_rgba(45,106,79,0.06)] hover:shadow-[0_3px_12px_rgba(45,106,79,0.12)]'
                }`}
                onClick={() => setCategory(category === cat.value ? '' : cat.value)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Split mode selector */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1.5">Split method</label>
          <div className="flex rounded-full overflow-hidden shadow-[0_3px_12px_rgba(45,106,79,0.06)] bg-white">
            {(['even', 'amount', 'percent'] as SplitMode[]).map((mode) => {
              const labels: Record<SplitMode, string> = {
                even: 'Even',
                amount: 'Exact',
                percent: 'Percent',
              };
              return (
                <button
                  key={mode}
                  type="button"
                  className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                    splitMode === mode
                      ? 'bg-canopy text-white'
                      : 'text-text-light hover:text-text-dark'
                  }`}
                  onClick={() => setSplitMode(mode)}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Even split preview */}
        {splitMode === 'even' && (
          <div className="mb-4 bg-leaf/10 rounded-2xl p-4">
            <p className="text-sm font-bold text-text-light mb-2">Split preview:</p>
            {evenSplitPreview ? (
              <ul className="space-y-1">
                {evenSplitPreview.map((split) => {
                  const member = group.members.find((m) => m.id === split.memberId);
                  return (
                    <li key={split.memberId} className="flex justify-between text-sm">
                      <span className="font-semibold">{member?.name ?? split.memberId}</span>
                      <span className="font-display text-base">{formatCurrency(split.amountCents)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-text-light">Enter an amount above to see the split preview.</p>
            )}
          </div>
        )}

        {/* Exact amount inputs */}
        {splitMode === 'amount' && (
          <div className="mb-4">
            <p className="text-sm font-bold mb-2">Enter each member's share:</p>
            <div className="space-y-2">
              {memberSplits.map((split) => {
                const member = group.members.find((m) => m.id === split.memberId);
                return (
                  <div key={split.memberId} className="flex items-center gap-2">
                    <label className="w-28 text-sm font-semibold text-text-dark shrink-0 truncate">
                      {member?.name ?? split.memberId}
                    </label>
                    <div className="flex items-center bg-white rounded-xl shadow-[0_2px_8px_rgba(45,106,79,0.06)] focus-within:ring-2 focus-within:ring-leaf overflow-hidden">
                      <span className="px-2.5 py-1.5 text-text-light bg-leaf/10 text-sm font-bold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-24 px-2.5 py-1.5 text-sm focus:outline-none bg-transparent font-semibold"
                        value={split.value}
                        onChange={(e) =>
                          setMemberSplits((prev) =>
                            prev.map((s) =>
                              s.memberId === split.memberId
                                ? { ...s, value: e.target.value }
                                : s
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`mt-2 text-sm font-bold ${amountSplitSum === totalCentsPreview && totalCentsPreview > 0 ? 'text-leaf' : 'text-toucan-orange'}`}>
              {totalCentsPreview > 0 && amountSplitSum === totalCentsPreview
                ? 'Amounts match ✓'
                : `Amounts total ${formatCurrency(amountSplitSum)} — must equal ${formatCurrency(totalCentsPreview)}`}
            </div>
            {errors.splits && (
              <p className="text-parrot-red text-sm mt-1 font-semibold">{errors.splits}</p>
            )}
          </div>
        )}

        {/* Percentage inputs */}
        {splitMode === 'percent' && (
          <div className="mb-4">
            <p className="text-sm font-bold mb-2">Enter each member's percentage:</p>
            <div className="space-y-2">
              {memberSplits.map((split) => {
                const member = group.members.find((m) => m.id === split.memberId);
                return (
                  <div key={split.memberId} className="flex items-center gap-2">
                    <label className="w-28 text-sm font-semibold text-text-dark shrink-0 truncate">
                      {member?.name ?? split.memberId}
                    </label>
                    <div className="flex items-center bg-white rounded-xl shadow-[0_2px_8px_rgba(45,106,79,0.06)] focus-within:ring-2 focus-within:ring-leaf overflow-hidden">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="0"
                        className="w-20 px-2.5 py-1.5 text-sm focus:outline-none bg-transparent font-semibold"
                        value={split.value}
                        onChange={(e) =>
                          setMemberSplits((prev) =>
                            prev.map((s) =>
                              s.memberId === split.memberId
                                ? { ...s, value: e.target.value }
                                : s
                            )
                          )
                        }
                      />
                      <span className="px-2.5 py-1.5 text-text-light bg-leaf/10 text-sm font-bold">
                        %
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`mt-2 text-sm font-bold ${percentSplitSum === 100 ? 'text-leaf' : 'text-toucan-orange'}`}>
              {percentSplitSum === 100
                ? 'Percentages add up ✓'
                : `Percentages total ${percentSplitSum}% — must equal 100%`}
            </div>
            {errors.splits && (
              <p className="text-parrot-red text-sm mt-1 font-semibold">{errors.splits}</p>
            )}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isFormInvalid}
          className="w-full bg-gradient-to-r from-canopy to-leaf text-white rounded-full py-4 font-display text-lg shadow-[0_6px_24px_rgba(64,145,108,0.25)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isEditMode ? 'Save Changes' : 'Add Expense'}
        </button>
      </form>
    </>
  );
}
