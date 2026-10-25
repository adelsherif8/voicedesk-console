import type { ReactNode } from 'react';

import { useSnapshot } from '../api/snapshot';
import type { Snapshot } from '../api/types';

/** Renders loading and error states for the snapshot once, so pages only deal with data. */
export function SnapshotBoundary({ children }: { children: (snapshot: Snapshot) => ReactNode }) {
  const { data, isPending, isError, error, refetch, isFetching } = useSnapshot();
  if (isPending) {
    return (
      <p role="status" className="notice">
        Loading eval results…
      </p>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="notice notice-error">
        <p>{error.message || 'Could not load eval results.'}</p>
        <button type="button" onClick={() => void refetch()} disabled={isFetching}>
          Retry
        </button>
      </div>
    );
  }
  return <>{children(data)}</>;
}
