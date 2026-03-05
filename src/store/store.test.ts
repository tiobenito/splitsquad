import { describe, it, expect, beforeEach, vi } from 'vitest';

// Vitest 4.x with jsdom: the `localStorage` global is a read-only proxy.
// We stub it with jsdom's real Storage object (which has clear/setItem/getItem).
// This is the correct pattern for Vitest 4 + jsdom + Zustand persist testing.
function getJsdomStorage(): Storage {
  // jsdom is exposed on global by Vitest's jsdom environment
  return (globalThis as any).jsdom.window.localStorage as Storage;
}

describe('Zustand store', () => {
  beforeEach(() => {
    // Stub global localStorage with jsdom's real Storage (has clear, setItem, getItem)
    const realStorage = getJsdomStorage();
    realStorage.clear();
    vi.stubGlobal('localStorage', realStorage);
    // Reset module registry so each test gets a fresh store instance
    vi.resetModules();
  });

  it('initializes with empty groups array', async () => {
    // Dynamically import to get fresh store instance after localStorage.clear()
    const { useAppStore } = await import('./index');
    const state = useAppStore.getState();
    expect(state.groups).toEqual([]);
  });

  it('addGroup creates a group with correct shape', async () => {
    const { useAppStore } = await import('./index');
    useAppStore.getState().addGroup('Bali Trip');

    const state = useAppStore.getState();
    expect(state.groups).toHaveLength(1);
    expect(state.groups[0].name).toBe('Bali Trip');
    expect(state.groups[0].id).toBeTruthy();
    expect(state.groups[0].members).toEqual([]);
    expect(state.groups[0].expenses).toEqual([]);
    expect(typeof state.groups[0].createdAt).toBe('number');
  });

  it('addMember adds a member to the correct group', async () => {
    const { useAppStore } = await import('./index');
    useAppStore.getState().addGroup('Test Group');
    const groupId = useAppStore.getState().groups[0].id;

    useAppStore.getState().addMember(groupId, 'Alice');
    const group = useAppStore.getState().groups[0];

    expect(group.members).toHaveLength(1);
    expect(group.members[0].name).toBe('Alice');
    expect(group.members[0].id).toBeTruthy();
  });

  it('addExpense stores totalCents as integer (FOUND-02 enforcement)', async () => {
    const { useAppStore } = await import('./index');
    const { toCents } = await import('../utils/money');

    useAppStore.getState().addGroup('Test Group');
    const groupId = useAppStore.getState().groups[0].id;
    useAppStore.getState().addMember(groupId, 'Alice');
    const memberId = useAppStore.getState().groups[0].members[0].id;

    useAppStore.getState().addExpense(groupId, {
      description: 'Dinner',
      totalCents: toCents(45.00),  // 4500 — integer cents
      paidByMemberId: memberId,
      splits: [{ memberId, amountCents: toCents(45.00) }],
      category: 'food',
    });

    const expense = useAppStore.getState().groups[0].expenses[0];
    expect(expense.totalCents).toBe(4500);
    expect(Number.isInteger(expense.totalCents)).toBe(true);
    expect(expense.splits[0].amountCents).toBe(4500);
    expect(Number.isInteger(expense.splits[0].amountCents)).toBe(true);
  });

  it('persist middleware writes to localStorage', async () => {
    const { useAppStore } = await import('./index');
    useAppStore.getState().addGroup('Persisted Group');

    // Zustand persist writes synchronously to localStorage for localStorage storage
    const stored = localStorage.getItem('splitsquad-store');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.groups[0].name).toBe('Persisted Group');
  });

  it('state key in localStorage is exactly "splitsquad-store"', async () => {
    const { useAppStore } = await import('./index');
    useAppStore.getState().addGroup('Key Check');

    const keys = Object.keys(localStorage);
    expect(keys).toContain('splitsquad-store');
    expect(keys).toHaveLength(1);  // Only ONE localStorage key — never multiple
  });

  it('settleDebt appends a settlement record to the group', async () => {
    const { useAppStore } = await import('./index');
    useAppStore.getState().addGroup('Trip');
    const groupId = useAppStore.getState().groups[0].id;
    useAppStore.getState().addMember(groupId, 'Alice');
    useAppStore.getState().addMember(groupId, 'Bob');
    const [alice, bob] = useAppStore.getState().groups[0].members;

    useAppStore.getState().settleDebt(groupId, bob.id, alice.id, 1000);

    const group = useAppStore.getState().groups[0];
    expect(group.settlements).toHaveLength(1);
    expect(group.settlements[0].from).toBe(bob.id);
    expect(group.settlements[0].to).toBe(alice.id);
    expect(group.settlements[0].amountCents).toBe(1000);
    expect(group.settlements[0].id).toBeTruthy();
    expect(typeof group.settlements[0].settledAt).toBe('number');
  });

  it('settleDebt does not modify expenses array', async () => {
    const { useAppStore } = await import('./index');
    const { toCents } = await import('../utils/money');

    useAppStore.getState().addGroup('Trip');
    const groupId = useAppStore.getState().groups[0].id;
    useAppStore.getState().addMember(groupId, 'Alice');
    const memberId = useAppStore.getState().groups[0].members[0].id;

    useAppStore.getState().addExpense(groupId, {
      description: 'Dinner',
      totalCents: toCents(30.00),
      paidByMemberId: memberId,
      splits: [{ memberId, amountCents: toCents(30.00) }],
    });

    const expensesBefore = useAppStore.getState().groups[0].expenses;
    useAppStore.getState().settleDebt(groupId, memberId, memberId, 500);

    const expensesAfter = useAppStore.getState().groups[0].expenses;
    expect(expensesAfter).toHaveLength(expensesBefore.length);
    expect(expensesAfter[0].id).toBe(expensesBefore[0].id);
    expect(expensesAfter[0].totalCents).toBe(expensesBefore[0].totalCents);
  });

  it('unsettleDebt removes a specific settlement by id', async () => {
    const { useAppStore } = await import('./index');
    useAppStore.getState().addGroup('Trip');
    const groupId = useAppStore.getState().groups[0].id;
    useAppStore.getState().addMember(groupId, 'Alice');
    useAppStore.getState().addMember(groupId, 'Bob');
    const [alice, bob] = useAppStore.getState().groups[0].members;

    useAppStore.getState().settleDebt(groupId, bob.id, alice.id, 500);
    useAppStore.getState().settleDebt(groupId, bob.id, alice.id, 300);

    const firstSettlementId = useAppStore.getState().groups[0].settlements[0].id;
    const secondSettlementId = useAppStore.getState().groups[0].settlements[1].id;

    useAppStore.getState().unsettleDebt(groupId, firstSettlementId);

    const settlements = useAppStore.getState().groups[0].settlements;
    expect(settlements).toHaveLength(1);
    expect(settlements[0].id).toBe(secondSettlementId);
    expect(settlements[0].amountCents).toBe(300);
  });

  it('settleDebt works on groups without existing settlements field', async () => {
    const { useAppStore } = await import('./index');
    useAppStore.getState().addGroup('Old Group');
    const groupId = useAppStore.getState().groups[0].id;
    useAppStore.getState().addMember(groupId, 'Alice');
    useAppStore.getState().addMember(groupId, 'Bob');
    const [alice, bob] = useAppStore.getState().groups[0].members;

    // Manually remove settlements field to simulate pre-Phase 3 persisted data
    useAppStore.setState((state) => ({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, settlements: undefined as any } : g
      ),
    }));

    // Should not throw
    expect(() => {
      useAppStore.getState().settleDebt(groupId, bob.id, alice.id, 1000);
    }).not.toThrow();

    const group = useAppStore.getState().groups[0];
    expect(group.settlements).toHaveLength(1);
    expect(group.settlements[0].amountCents).toBe(1000);
  });
});
