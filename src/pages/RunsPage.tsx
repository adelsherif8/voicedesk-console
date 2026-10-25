import { Link } from 'react-router-dom';

import { useSnapshot } from '../api/snapshot';
import { formatDate, formatPct } from '../lib/format';
import { runRows } from '../lib/selectors';

export function RunsPage() {
  const { data } = useSnapshot();
  if (!data) return null;
  const rows = runRows(data);

  return (
    <section>
      <h1 id="runs-heading">Eval runs</h1>
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
    </section>
  );
}
