/**
 * SplitSquad Core Type System
 *
 * MONEY RULE: All monetary values in this codebase are integers in cents.
 * $14.50 is stored as 1450. Never use floating-point for money.
 * The Cents type alias enforces this convention at the type level.
 */

/** Integer cents. $14.50 = 1450. Never floating-point. */
export type Cents = number;

export type SplitStrategy = 'even' | 'amount' | 'percent';

export interface Member {
  id: string;       // uuid v4
  name: string;
}

export interface Split {
  memberId: string;
  amountCents: Cents;  // always an integer; sum(splits.amountCents) MUST === expense.totalCents
}

export interface SplitInput {
  memberId: string;
  value: number;    // cents for 'amount' strategy; integer percentage points (0-100) for 'percent'
}

export interface Expense {
  id: string;             // uuid v4
  groupId: string;
  description: string;
  totalCents: Cents;      // always an integer
  paidByMemberId: string;
  splits: Split[];        // invariant: sum(splits.amountCents) === totalCents
  category?: string;
  createdAt: number;      // Unix timestamp ms
}

export interface Settlement {
  id: string;              // uuid v4
  groupId: string;
  from: string;            // memberId — the payer (person settling debt)
  to: string;              // memberId — the recipient (person being paid back)
  amountCents: Cents;      // amount settled (positive integer)
  settledAt: number;       // Unix timestamp ms
}

export interface Group {
  id: string;             // uuid v4
  name: string;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  createdAt: number;      // Unix timestamp ms
}

export interface Transaction {
  from: string;           // memberId — this person owes money
  to: string;             // memberId — this person is owed money
  amountCents: Cents;     // always positive integer
}

/** Net balance for a single member within a group.
 *  Positive: others owe this member. Negative: this member owes others. */
export interface Balance {
  memberId: string;
  netCents: Cents;        // positive = owed money; negative = owes money
}
