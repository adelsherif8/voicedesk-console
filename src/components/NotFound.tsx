import { Link } from 'react-router-dom';

export function RunNotFound({ runId }: { runId: string }) {
  return (
    <section>
      <h1>Run not found</h1>
      <p className="notice">
        Run “{runId}” was not found in the published results. <Link to="/">See all runs</Link>.
      </p>
    </section>
  );
}
