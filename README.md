# SplitSquad

Group expense splitting without the account overhead. Create a group, add people, log what you spent — SplitSquad does the math.

**[Live demo →](https://splitsquad-beta.vercel.app)**

---

## What it does

- **Create groups** for any trip, dinner, apartment, or shared expense
- **Log expenses** — choose who paid and how to split: evenly, by exact amount, or by percentage
- **Track balances** — see at a glance who owes who and how much
- **Settle up** — mark debts paid off (with confetti)
- **Leaderboard** — see who's been the most generous in the group
- **Works offline** — everything lives in localStorage, no accounts or backend required

## Stack

- React 19 + TypeScript
- Zustand (with localStorage persistence)
- React Router v7
- Tailwind CSS v4
- Vite

## Run locally

```bash
npm install
npm run dev
```

## Design decisions

- All money stored as integer cents — no floating-point rounding errors
- Balances derived on-demand from expenses, never stored
- Debt simplification: reduces N-to-N payments to the minimum number of transactions
- One Zustand store, one localStorage key — no partial rehydration bugs
