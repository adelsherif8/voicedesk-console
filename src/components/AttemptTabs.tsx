import type { CallResult } from '../api/types';

interface Props {
  attempts: CallResult[];
  selected: number;
  onSelect: (index: number) => void;
}

/** One tab per attempt of the scenario; arrow keys move between them (WAI-ARIA tabs pattern). */
export function AttemptTabs({ attempts, selected, onSelect }: Props) {
  const move = (delta: number) => onSelect((selected + delta + attempts.length) % attempts.length);
  return (
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
          onClick={() => onSelect(i)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') move(1);
            if (e.key === 'ArrowLeft') move(-1);
          }}
        >
          Attempt {a.attempt}: {a.passed ? 'passed' : 'failed'}
        </button>
      ))}
    </div>
  );
}
