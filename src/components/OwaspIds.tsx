import { OWASP_LLM } from '../lib/owasp';

/** OWASP LLM Top 10 ids as small badges; the full name is in the tooltip and in the page legend. */
export function OwaspIds({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <span className="owasp-ids">
      {ids.map((id) => (
        <abbr key={id} title={OWASP_LLM[id] ?? id} className="owasp">
          {id}
        </abbr>
      ))}
    </span>
  );
}
