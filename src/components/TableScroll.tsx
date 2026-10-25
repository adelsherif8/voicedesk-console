import type { ReactNode } from 'react';

/**
 * Horizontal scroll container for wide tables on small screens. It is focusable and labelled so
 * keyboard users can scroll it with the arrow keys (axe rule scrollable-region-focusable).
 */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable regions must be focusable
    <div className="table-wrap" role="region" aria-label={`${label} (scrollable)`} tabIndex={0}>
      {children}
    </div>
  );
}
