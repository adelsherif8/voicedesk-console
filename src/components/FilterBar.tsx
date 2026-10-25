import { AGENTS, type Filters, STATUSES } from '../lib/selectors';
import type { FilterPatch } from '../lib/useFilters';

const AGENT_LABEL: Record<(typeof AGENTS)[number], string> = {
  dental: 'Dental front desk',
  receptionist: 'Storage receptionist',
  recovery: 'Revenue recovery',
};

interface Props {
  filters: Filters;
  onChange: (patch: FilterPatch) => void;
  /** The runs list has no per-scenario status, so it hides that select. */
  withStatus?: boolean;
}

export function FilterBar({ filters, onChange, withStatus = false }: Props) {
  return (
    <form className="filters" aria-label="Filters" onSubmit={(e) => e.preventDefault()}>
      <label>
        Agent
        <select value={filters.agent ?? ''} onChange={(e) => onChange({ agent: e.target.value })}>
          <option value="">All agents</option>
          {AGENTS.map((a) => (
            <option key={a} value={a}>
              {AGENT_LABEL[a]}
            </option>
          ))}
        </select>
      </label>
      {withStatus && (
        <label>
          Status
          <select value={filters.status ?? ''} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}
    </form>
  );
}
