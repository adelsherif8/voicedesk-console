import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { type Filters, parseFilters } from './selectors';

export type FilterPatch = Partial<Record<keyof Filters, string | undefined>>;

/** Agent and status filters, read from and written to the query string so links carry them. */
export function useFilters(): [Filters, (patch: FilterPatch) => void] {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (patch: FilterPatch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [parseFilters(params), set];
}
