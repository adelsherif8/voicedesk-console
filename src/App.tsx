import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { RunPage } from './pages/RunPage';
import { RunsPage } from './pages/RunsPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RunsPage />} />
        <Route path="runs/:runId" element={<RunPage />} />
      </Route>
    </Routes>
  );
}
