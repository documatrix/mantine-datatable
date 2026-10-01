import { useEffect, useMemo, useState } from 'react';

export function useLastSelectionChangeIndex(recordIds: unknown[] | undefined) {
  const [lastSelectionChangeIndex, setLastSelectionChangeIndex] = useState<number | null>(null);
  const recordIdsString = useMemo(() => recordIds?.join(':') || '', [recordIds]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when recordIds change
  useEffect(() => {
    setLastSelectionChangeIndex(null);
  }, [recordIdsString]);

  return { lastSelectionChangeIndex, setLastSelectionChangeIndex };
}
