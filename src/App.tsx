import { BrowserRouter, Routes, Route } from 'react-router';
import Layout from './components/Layout';
import GroupListView from './views/GroupListView';
import GroupDetailView from './views/GroupDetailView';
import ExpenseFormView from './views/ExpenseFormView';
import BalancesView from './views/BalancesView';
import AllBalancesView from './views/AllBalancesView';
import LeaderboardView from './views/LeaderboardView';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<GroupListView />} />
          <Route path="/balances" element={<AllBalancesView />} />
          <Route path="/groups/:groupId" element={<GroupDetailView />} />
          <Route path="/groups/:groupId/balances" element={<BalancesView />} />
          <Route path="/groups/:groupId/leaderboard" element={<LeaderboardView />} />
          <Route path="/groups/:groupId/expenses/new" element={<ExpenseFormView />} />
          <Route path="/groups/:groupId/expenses/:expenseId/edit" element={<ExpenseFormView />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
