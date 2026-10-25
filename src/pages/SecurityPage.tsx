import { faShieldHalved, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useParams } from 'react-router-dom';

import type { FullRun, RunSummary } from '../api/types';
import { RunNotFound } from '../components/NotFound';
import { OwaspIds } from '../components/OwaspIds';
import { SnapshotBoundary } from '../components/SnapshotBoundary';
import { TableScroll } from '../components/TableScroll';
import { agentLabel } from '../lib/agents';
import { formatDate, formatPct } from '../lib/format';
import { OWASP_LLM } from '../lib/owasp';
import { findRun, predatesSecurity, securityRows, securityScenarios } from '../lib/selectors';

export function SecurityPage() {
  const { runId = '' } = useParams();
  return (
    <SnapshotBoundary>
      {(snapshot) => {
        const run = findRun(snapshot, runId);
        return run ? <SecurityView run={run} /> : <RunNotFound runId={runId} />;
      }}
    </SnapshotBoundary>
  );
}

/** A count that is critical whenever it is above zero: said in words, not only in colour. */
function CriticalCount({ n }: { n: number }) {
  return n === 0 ? (
    <span className="zero">0</span>
  ) : (
    <span className="crit">
      <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" /> {n} critical
    </span>
  );
}

function SecurityView({ run }: { run: RunSummary | FullRun }) {
  const rows = securityRows(run);
  const scenarios = securityScenarios(run);
  const usedIds = [...new Set(scenarios.flatMap((s) => s.owasp))].sort();

  return (
    <section>
      <nav aria-label="Breadcrumb">
        <Link to="/">Eval runs</Link> › <Link to={`/runs/${run.id}`}>{formatDate(run.created)}</Link>
      </nav>
      <h1>
        <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /> Security
      </h1>
      <p className="meta">
        OWASP Top 10 for LLM Applications 2025 · Run {run.id} · {run.agent_model}
      </p>

      {predatesSecurity(run) ? (
        <p className="notice">This run predates the security track, so it has no security results.</p>
      ) : (
        <>
          <h2 id="security-agents">Security by agent</h2>
          <TableScroll label="Security by agent">
            <table aria-labelledby="security-agents">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Security calls</th>
                  <th scope="col">Injection resistance</th>
                  <th scope="col">Prompt leaks</th>
                  <th scope="col">Cross-customer PII leaks</th>
                  <th scope="col">Unauthorized tool calls</th>
                  <th scope="col">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.agent}>
                    <th scope="row">{agentLabel(r.agent)}</th>
                    {r.verdict.kind === 'unavailable' ? (
                      <td colSpan={6}>This agent's results predate the security track.</td>
                    ) : (
                      <>
                        <td>{r.calls}</td>
                        <td>{formatPct(r.resistance)}</td>
                        <td>
                          <CriticalCount n={r.promptLeaks} />
                        </td>
                        <td>
                          <CriticalCount n={r.piiLeaks} />
                        </td>
                        <td>
                          <CriticalCount n={r.unauthorized} />
                        </td>
                        <td>
                          <span className={`verdict verdict-${r.verdict.kind}`}>{r.verdict.label}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <p className="meta">
            Any prompt leak, cross-customer PII leak or unauthorized tool call is critical and fails
            VoiceDesk's CI gate.
            {'redaction' in run && run.redaction
              ? ` Transcripts are PII-redacted (${run.redaction}) before publishing.`
              : ''}
          </p>

          <h2 id="security-scenarios">Security scenarios</h2>
          {scenarios.length === 0 ? (
            <p className="notice">No security scenarios in this run.</p>
          ) : (
            <TableScroll label="Security scenarios">
              <table aria-labelledby="security-scenarios">
                <thead>
                  <tr>
                    <th scope="col">Agent</th>
                    <th scope="col">Scenario</th>
                    <th scope="col">OWASP LLM</th>
                    <th scope="col">Status</th>
                    <th scope="col">Passed</th>
                    <th scope="col">Criticals</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={`${s.agent}/${s.id}`}>
                      <td>{s.agent}</td>
                      <td>
                        <Link to={`/runs/${run.id}/${s.agent}/${s.id}`}>{s.title}</Link>
                      </td>
                      <td>
                        <OwaspIds ids={s.owasp} />
                      </td>
                      <td>
                        <span className={`status status-${s.status}`}>{s.status}</span>
                      </td>
                      <td>
                        {s.passes}/{s.runs}
                      </td>
                      <td>
                        <CriticalCount n={s.criticals} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}

          {usedIds.length > 0 && (
            <>
              <h2 id="owasp-legend">OWASP LLM ids used here</h2>
              <ul className="legend" aria-labelledby="owasp-legend">
                {usedIds.map((id) => (
                  <li key={id}>{`${id}: ${OWASP_LLM[id] ?? 'unknown id'}`}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
