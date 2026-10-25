import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { ComparePage } from './pages/ComparePage';
import { RunPage } from './pages/RunPage';
import { RunsPage } from './pages/RunsPage';
import { ScenarioPage } from './pages/ScenarioPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RunsPage />} />
        <Route path="runs/:runId" element={<RunPage />} />
        <Route path="runs/:runId/compare" element={<ComparePage />} />
        <Route path="runs/:runId/:agent/:scenarioId" element={<ScenarioPage />} />
      </Route>
    </Routes>
  );
}
