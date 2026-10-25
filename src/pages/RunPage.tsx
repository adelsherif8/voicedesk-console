import { Link, useParams } from 'react-router-dom';

import type { FullRun, RunSummary } from '../api/types';
import { FilterBar } from '../components/FilterBar';
import { RunNotFound } from '../components/NotFound';
import { SnapshotBoundary } from '../components/SnapshotBoundary';
import { formatDate } from '../lib/format';
import { OWASP_LLM } from '../lib/owasp';
import { findRun, owaspByScenario, scenarioRows } from '../lib/selectors';
import { useFilters } from '../lib/useFilters';
import { TableScroll } from '../components/TableScroll';

export function RunPage() {
  const { runId = '' } = useParams();
  return (
    <SnapshotBoundary>
      {(snapshot) => {
        const run = findRun(snapshot, runId);
        return run ? <RunView run={run} /> : <RunNotFound runId={runId} />;
      }}
    </SnapshotBoundary>
  );
}

function RunView({ run }: { run: RunSummary | FullRun }) {
  const [filters, setFilters] = useFilters();
  const rows = scenarioRows(run, filters);
  const owasp = owaspByScenario(run);

  return (
    <section>
      <nav aria-label="Breadcrumb">
        <Link to="/">Eval runs</Link>
      </nav>
      <h1 id="scenarios-heading">
        Scenarios · {formatDate(run.created)} · {run.agent_model}
      </h1>
      <p className="meta">
        <Link to={`/runs/${run.id}/compare`}>Compare with baseline</Link> ·{' '}
        <Link to={`/runs/${run.id}/security`}>Security</Link>
      </p>
      <FilterBar filters={filters} onChange={setFilters} withStatus />
      {rows.length === 0 ? (
        <div className="notice">
          <p>No scenarios match the current filters.</p>
          <button type="button" onClick={() => setFilters({ agent: undefined, status: undefined })}>
            Clear filters
          </button>
        </div>
      ) : (
        <TableScroll label="Scenarios">
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
                    {(owasp.get(`${r.agent}/${r.id}`) ?? []).length > 0 && (
                      <span className="owasp-ids">
                        {(owasp.get(`${r.agent}/${r.id}`) ?? []).map((id) => (
                          <abbr key={id} title={OWASP_LLM[id] ?? id} className="owasp">
                            {id}
                          </abbr>
                        ))}
                      </span>
                    )}
                    {r.criticals > 0 && (
                      <span className="crit badge-crit">{r.criticals} security critical</span>
                    )}
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
        </TableScroll>
      )}
    </section>
  );
}
