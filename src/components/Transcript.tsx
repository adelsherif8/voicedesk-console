import { faHeadset, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import type { Check, TranscriptTurn } from '../api/types';

interface Props {
  transcript: TranscriptTurn[];
  checks: Check[];
  /** Transcript index of the turn to mark as the failing one. */
  failingTurn: number | null;
}

export function Transcript({ transcript, checks, failingTurn }: Props) {
  const flagsAt = (index: number) =>
    checks.filter((c) => !c.passed && c.kind !== 'classify' && c.turn === index);
  return (
    <ol className="transcript" aria-label="Transcript">
      {transcript.map((t, i) => {
        const flags = flagsAt(i);
        const failing = i === failingTurn;
        return (
          <li
            key={i}
            className={`turn turn-${t.role}${failing ? ' turn-failing' : ''}`}
            {...(failing ? { 'aria-current': 'true' } : {})}
          >
            <div className="turn-who">
              <FontAwesomeIcon icon={t.role === 'agent' ? faHeadset : faUser} aria-hidden="true" />
              <span>{t.role === 'agent' ? 'Agent' : 'Simulated caller'}</span>
              <span className="turn-index">T{i}</span>
              {failing && <span className="badge badge-fail">Failing turn</span>}
            </div>
            <p className="turn-text">{t.text}</p>
            {t.tool_calls?.map((call, j) => (
              <pre key={j} className="tool-call">
                <code>
                  {call.name}({JSON.stringify(call.args)})
                </code>
              </pre>
            ))}
            {flags.length > 0 && (
              <div className="turn-flags" aria-label={`Checks flagged on turn ${i}`}>
                {flags.map((c) => (
                  <span key={c.id} className={c.advisory ? 'flag flag-advisory' : 'flag flag-fail'}>
                    {c.id}
                    {c.advisory ? ' (advisory)' : ''}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
