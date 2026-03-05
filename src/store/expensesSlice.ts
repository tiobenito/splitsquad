import { v4 as uuidv4 } from 'uuid';
import type { StateCreator } from 'zustand';
import type { Expense } from '../types';

export interface ExpensesSlice {
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'groupId' | 'createdAt'>) => void;
  updateExpense: (groupId: string, expenseId: string, updates: Partial<Omit<Expense, 'id' | 'groupId' | 'createdAt'>>) => void;
  deleteExpense: (groupId: string, expenseId: string) => void;
}

// Expenses are stored on the Group object — expensesSlice modifies groups state.
// This slice requires access to GroupsSlice state via the combined store type.
// Use `any` for StateCreator type to avoid circular type dependency at this stage.
// Phase 2 will wire up the full combined store type.
export const createExpensesSlice: StateCreator<any> = (set) => ({
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'groupId' | 'createdAt'>) =>
    set((state: any) => ({
      groups: state.groups.map((g: any) =>
        g.id === groupId
          ? {
              ...g,
              expenses: [
                ...g.expenses,
                {
                  ...expense,
                  id: uuidv4(),
                  groupId,
                  createdAt: Date.now(),
                },
              ],
            }
          : g
      ),
    })),

  updateExpense: (groupId: string, expenseId: string, updates: Partial<Omit<Expense, 'id' | 'groupId' | 'createdAt'>>) =>
    set((state: any) => ({
      groups: state.groups.map((g: any) =>
        g.id === groupId
          ? {
              ...g,
              expenses: g.expenses.map((e: Expense) =>
                e.id === expenseId ? { ...e, ...updates } : e
              ),
            }
          : g
      ),
    })),

  deleteExpense: (groupId: string, expenseId: string) =>
    set((state: any) => ({
      groups: state.groups.map((g: any) =>
        g.id === groupId
          ? {
              ...g,
              expenses: g.expenses.filter((e: Expense) => e.id !== expenseId),
            }
          : g
      ),
    })),
});
