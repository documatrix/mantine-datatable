import { useEffect, useMemo, useRef } from 'react';

// Shift-click range anchor. A ref, not state: it is only read inside click handlers and must not
// re-render the table.
export function useLastSelectionChangeIndex(recordIds: unknown[] | undefined) {
  const lastSelectionChangeIndexRef = useRef<number | null>(null);
  const recordIdsString = useMemo(() => recordIds?.join(':') || '', [recordIds]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when recordIds change
  useEffect(() => {
    lastSelectionChangeIndexRef.current = null;
  }, [recordIdsString]);

  return lastSelectionChangeIndexRef;
}
