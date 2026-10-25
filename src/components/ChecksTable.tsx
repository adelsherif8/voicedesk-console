import type { Check } from '../api/types';

export function ChecksTable({ checks }: { checks: Check[] }) {
  return (
    <div className="table-wrap">
      <table aria-label="Checks">
        <thead>
          <tr>
            <th scope="col">Check</th>
            <th scope="col">Kind</th>
            <th scope="col">Result</th>
            <th scope="col">Turn</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c, i) => (
            <tr key={`${c.id}-${i}`}>
              <td>
                <code>{c.id}</code>
              </td>
              <td>{c.kind}</td>
              <td>
                <span
                  className={`status ${c.passed ? 'status-pass' : c.advisory ? 'status-flaky' : 'status-fail'}`}
                >
                  {c.passed ? 'passed' : c.advisory ? 'advisory' : 'failed'}
                </span>
              </td>
              <td>{c.turn === null ? '' : `T${c.turn}`}</td>
              <td>{c.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
