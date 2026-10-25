import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { FullRun, RunSummary } from '../api/types';
import { AttemptTabs } from '../components/AttemptTabs';
import { ChecksTable } from '../components/ChecksTable';
import { RunNotFound } from '../components/NotFound';
import { SnapshotBoundary } from '../components/SnapshotBoundary';
import { Transcript } from '../components/Transcript';
import { formatDate } from '../lib/format';
import { attemptsOf, failingTurn, findRun } from '../lib/selectors';

export function ScenarioPage() {
  const { runId = '', agent = '', scenarioId = '' } = useParams();
  return (
    <SnapshotBoundary>
      {(snapshot) => {
        const run = findRun(snapshot, runId);
        return run ? (
          <ScenarioView run={run} agent={agent} scenarioId={scenarioId} />
        ) : (
          <RunNotFound runId={runId} />
        );
      }}
    </SnapshotBoundary>
  );
}

function ScenarioView({
  run,
  agent,
  scenarioId,
}: {
  run: RunSummary | FullRun;
  agent: string;
  scenarioId: string;
}) {
  const [selected, setSelected] = useState(0);
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
          <AttemptTabs attempts={attempts} selected={selected} onSelect={setSelected} />
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
