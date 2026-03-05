import { v4 as uuidv4 } from 'uuid';
import type { StateCreator } from 'zustand';
import type { Cents, Group, Settlement } from '../types';

export interface GroupsSlice {
  groups: Group[];
  addGroup: (name: string) => void;
  removeGroup: (groupId: string) => void;
  addMember: (groupId: string, name: string) => void;
  removeMember: (groupId: string, memberId: string) => void;
  settleDebt: (groupId: string, from: string, to: string, amountCents: Cents) => void;
  unsettleDebt: (groupId: string, settlementId: string) => void;
}

export const createGroupsSlice: StateCreator<GroupsSlice> = (set) => ({
  groups: [],

  addGroup: (name: string) =>
    set((state) => ({
      groups: [
        ...state.groups,
        {
          id: uuidv4(),
          name,
          members: [],
          expenses: [],
          settlements: [],
          createdAt: Date.now(),
        },
      ],
    })),

  removeGroup: (groupId: string) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    })),

  addMember: (groupId: string, name: string) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: [...g.members, { id: uuidv4(), name }],
            }
          : g
      ),
    })),

  removeMember: (groupId: string, memberId: string) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.filter((m) => m.id !== memberId),
            }
          : g
      ),
    })),

  settleDebt: (groupId: string, from: string, to: string, amountCents: Cents) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              settlements: [
                ...(g.settlements ?? []),
                {
                  id: uuidv4(),
                  groupId,
                  from,
                  to,
                  amountCents,
                  settledAt: Date.now(),
                } satisfies Settlement,
              ],
            }
          : g
      ),
    })),

  unsettleDebt: (groupId: string, settlementId: string) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              settlements: (g.settlements ?? []).filter(
                (s) => s.id !== settlementId
              ),
            }
          : g
      ),
    })),
});
