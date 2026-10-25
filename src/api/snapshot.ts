import { useQuery } from '@tanstack/react-query';

import { EVALS_URL } from './config';
import type { Snapshot } from './types';

export async function fetchSnapshot(url: string = EVALS_URL): Promise<Snapshot> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Could not load eval results (HTTP ${res.status})`);
  const body: unknown = await res.json();
  if (!isSnapshot(body)) throw new Error('Eval results are not in the expected shape');
  return body;
}

function isSnapshot(x: unknown): x is Snapshot {
  return (
    typeof x === 'object' &&
    x !== null &&
    Array.isArray((x as Snapshot).history) &&
    typeof (x as Snapshot).latest === 'object' &&
    (x as Snapshot).latest !== null
  );
}

/** The whole published snapshot. One request; every page derives its view from it. */
export function useSnapshot() {
  return useQuery({
    queryKey: ['snapshot', EVALS_URL],
    queryFn: () => fetchSnapshot(),
    staleTime: 5 * 60_000,
  });
}
