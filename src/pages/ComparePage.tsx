import { Link, useParams } from 'react-router-dom';

import { useSnapshot } from '../api/snapshot';
import type { Comparison } from '../api/types';
import { formatDate, formatPct } from '../lib/format';
import { type ChangeKind, comparisonRows, findRun } from '../lib/selectors';

const KIND_LABEL: Record<ChangeKind, string> = {
  regression: 'Regression',
  warning: 'Warning',
  improvement: 'Improved',
  new: 'New',
};

function AgentComparison({ runId, agent, cmp }: { runId: string; agent: string; cmp: Comparison }) {
  const rows = comparisonRows(cmp);
  const [before, after] = cmp.containment;
  const headingId = `cmp-${agent}`;
  return (
    <section aria-labelledby={headingId} className="card">
      <h2 id={headingId}>{agent}</h2>
      <p className="meta">
        vs baseline {cmp.baseline_run ?? 'unknown'} (k={cmp.baseline_k ?? '?'}) · {cmp.shared} shared
        scenarios · containment {formatPct(before)} → {formatPct(after)}
      </p>
      {rows.length === 0 ? (
        <p>No change against the baseline.</p>
      ) : (
        <ul className="changes">
          {rows.map((r, i) => (
            <li key={i} className={`change change-${r.kind}${r.critical ? ' change-critical' : ''}`}>
              <span className="change-kind">{r.critical ? 'Critical regression' : KIND_LABEL[r.kind]}</span>{' '}
              <Link to={`/runs/${runId}/${agent}/${r.scenario}`}>{r.scenario}</Link>
              {r.detail && <span className="change-detail"> · {r.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ComparePage() {
  const { runId = '' } = useParams();
  const { data } = useSnapshot();
  if (!data) return null;
  const run = findRun(data, runId);
  if (!run) return null;
  const comparison = 'comparison' in run ? run.comparison : undefined;

  return (
    <section>
      <nav aria-label="Breadcrumb">
        <Link to="/">Eval runs</Link> › <Link to={`/runs/${run.id}`}>{formatDate(run.created)}</Link>
      </nav>
      <h1>Baseline comparison</h1>
      <p className="meta">
        Run {run.id} · {run.agent_model} · k={run.k}
      </p>
      {comparison === undefined || Object.keys(comparison).length === 0 ? (
        <p className="notice">No baseline comparison was published for this run.</p>
      ) : (
        Object.entries(comparison).map(([agent, cmp]) => (
          <AgentComparison key={agent} runId={run.id} agent={agent} cmp={cmp} />
        ))
      )}
    </section>
  );
}
