import type { Check } from '../api/types';
import { CRITICAL_CHECKS } from '../lib/selectors';

function resultOf(c: Check): { label: string; className: string } {
  if (c.passed) return { label: 'passed', className: 'status-pass' };
  if (c.advisory) return { label: 'advisory', className: 'status-flaky' };
  if (CRITICAL_CHECKS.has(c.id)) return { label: 'critical', className: 'status-fail crit' };
  return { label: 'failed', className: 'status-fail' };
}
import { TableScroll } from './TableScroll';

export function ChecksTable({ checks }: { checks: Check[] }) {
  return (
    <TableScroll label="Checks">
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
                <span className={`status ${resultOf(c).className}`}>{resultOf(c).label}</span>
              </td>
              <td>{c.turn === null ? '' : `T${c.turn}`}</td>
              <td className="reason">{c.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
