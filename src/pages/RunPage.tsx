import { Link, useParams } from 'react-router-dom';

import { useSnapshot } from '../api/snapshot';
import { FilterBar } from '../components/FilterBar';
import { formatDate } from '../lib/format';
import { findRun, scenarioRows } from '../lib/selectors';
import { useFilters } from '../lib/useFilters';

export function RunPage() {
  const { runId = '' } = useParams();
  const { data } = useSnapshot();
  const [filters, setFilters] = useFilters();
  if (!data) return null;
  const run = findRun(data, runId);
  if (!run) return null;
  const rows = scenarioRows(run, filters);

  return (
    <section>
      <nav aria-label="Breadcrumb">
        <Link to="/">Eval runs</Link>
      </nav>
      <h1 id="scenarios-heading">
        Scenarios · {formatDate(run.created)} · {run.agent_model}
      </h1>
      <FilterBar filters={filters} onChange={setFilters} withStatus />
      <table aria-labelledby="scenarios-heading">
        <thead>
          <tr>
            <th scope="col">Agent</th>
            <th scope="col">Scenario</th>
            <th scope="col">Category</th>
            <th scope="col">Status</th>
            <th scope="col">Passed</th>
            <th scope="col">Missed handoffs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.agent}/${r.id}`}>
              <td>{r.agent}</td>
              <td>
                <Link to={`/runs/${run.id}/${r.agent}/${r.id}`}>{r.title}</Link>
              </td>
              <td>{r.category}</td>
              <td>
                <span className={`status status-${r.status}`}>{r.status}</span>
              </td>
              <td>
                {r.passes}/{r.runs}
              </td>
              <td>{r.missed === 0 ? '' : r.missed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
