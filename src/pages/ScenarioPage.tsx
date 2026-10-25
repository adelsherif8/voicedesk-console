import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useSnapshot } from '../api/snapshot';
import { ChecksTable } from '../components/ChecksTable';
import { Transcript } from '../components/Transcript';
import { formatDate } from '../lib/format';
import { attemptsOf, failingTurn, findRun } from '../lib/selectors';

export function ScenarioPage() {
  const { runId = '', agent = '', scenarioId = '' } = useParams();
  const { data } = useSnapshot();
  const [selected, setSelected] = useState(0);
  if (!data) return null;
  const run = findRun(data, runId);
  if (!run) return null;
  const attempts = attemptsOf(run, agent, scenarioId);
  const summary = run.summary[agent]?.scenarios[scenarioId];
  const current = attempts[selected] ?? attempts[0];

  return (
    <section>
      <nav aria-label="Breadcrumb">
        <Link to="/">Eval runs</Link> › <Link to={`/runs/${run.id}`}>{formatDate(run.created)}</Link>
      </nav>
      <h1>{current?.title ?? scenarioId}</h1>
      <p className="meta">
        {agent} · {scenarioId}
        {summary && (
          <>
            {' '}
            · <span className={`status status-${summary.status}`}>{summary.status}</span> {summary.passes}/
            {summary.runs} attempts passed
          </>
        )}
      </p>

      {current === undefined ? (
        <p className="notice">
          Transcripts are only published for the latest run of each model. This run keeps summary numbers
          only.
        </p>
      ) : (
        <>
          <div role="tablist" aria-label="Attempts" className="tabs">
            {attempts.map((a, i) => (
              <button
                key={a.attempt}
                role="tab"
                type="button"
                id={`attempt-tab-${a.attempt}`}
                aria-selected={i === selected}
                aria-controls="attempt-panel"
                tabIndex={i === selected ? 0 : -1}
                className={a.passed ? 'tab tab-pass' : 'tab tab-fail'}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') setSelected((selected + 1) % attempts.length);
                  if (e.key === 'ArrowLeft') setSelected((selected - 1 + attempts.length) % attempts.length);
                }}
              >
                Attempt {a.attempt}: {a.passed ? 'passed' : 'failed'}
              </button>
            ))}
          </div>
          <div id="attempt-panel" role="tabpanel" aria-labelledby={`attempt-tab-${current.attempt}`}>
            <p className="meta">
              Handoff: {current.handoff} (expected{' '}
              {Array.isArray(current.handoff_expected)
                ? current.handoff_expected.join(' or ')
                : current.handoff_expected}
              ) · Ended by: {current.end_reason.replace(/_/g, ' ')}
              {current.error && ` · Error: ${current.error}`}
            </p>
            <h2>Checks</h2>
            <ChecksTable checks={current.checks} />
            <h2>Transcript</h2>
            <Transcript
              transcript={current.transcript}
              checks={current.checks}
              failingTurn={failingTurn(current)}
            />
          </div>
        </>
      )}
    </section>
  );
}
