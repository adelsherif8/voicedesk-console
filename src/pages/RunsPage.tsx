import { Link } from 'react-router-dom';

import type { Snapshot } from '../api/types';
import { FilterBar } from '../components/FilterBar';
import { SnapshotBoundary } from '../components/SnapshotBoundary';
import { formatDate, formatPct } from '../lib/format';
import { runRows } from '../lib/selectors';
import { useFilters } from '../lib/useFilters';

export function RunsPage() {
  return <SnapshotBoundary>{(snapshot) => <RunsView snapshot={snapshot} />}</SnapshotBoundary>;
}

function RunsView({ snapshot }: { snapshot: Snapshot }) {
  const [filters, setFilters] = useFilters();
  const rows = runRows(snapshot, filters.agent);

  return (
    <section>
      <h1 id="runs-heading">Eval runs</h1>
      <FilterBar filters={filters} onChange={setFilters} />
      {rows.length === 0 ? (
        <p className="notice">No eval runs have been published yet.</p>
      ) : (
        <div className="table-wrap">
          <table aria-labelledby="runs-heading">
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">Model</th>
                <th scope="col">Calls</th>
                <th scope="col">Pass rate</th>
                <th scope="col">Containment</th>
                <th scope="col">Critical failures</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/runs/${r.id}`}>{formatDate(r.created)}</Link>
                  </td>
                  <td>{r.model}</td>
                  <td>{r.calls}</td>
                  <td>{formatPct(r.passRate)}</td>
                  <td>{formatPct(r.containment)}</td>
                  <td>{r.critical === 0 ? 'none' : `${r.critical} critical`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
