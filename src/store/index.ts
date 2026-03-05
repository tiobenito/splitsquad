import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createGroupsSlice, type GroupsSlice } from './groupsSlice';
import { createExpensesSlice, type ExpensesSlice } from './expensesSlice';

type AppStore = GroupsSlice & ExpensesSlice;

/**
 * Single Zustand store for all SplitSquad state.
 *
 * Design decisions:
 * - ONE store, ONE localStorage key ('splitsquad-store') — prevents partial rehydration bugs
 * - Slice pattern for code organization without multiple stores
 * - persist middleware handles all serialization/deserialization automatically
 * - Balances are NOT stored — derived on-demand from expenses via computeBalances()
 */
export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createGroupsSlice(...a),
      ...createExpensesSlice(...a),
    }),
    {
      name: 'splitsquad-store',  // Single localStorage key — NEVER change this
    }
  )
);
