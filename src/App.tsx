import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { RunsPage } from './pages/RunsPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RunsPage />} />
      </Route>
    </Routes>
  );
}
