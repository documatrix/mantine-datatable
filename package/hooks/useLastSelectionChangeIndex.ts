import { useEffect, useRef } from 'react';
import type { DataTableIdAccessor } from '../types';
import { getRecordId } from '../utils';

// Shift-click range anchor, read only in click handlers.
export function useLastSelectionChangeIndex<T>(records: T[] | undefined, idAccessor: DataTableIdAccessor<T>) {
  const lastSelectionChangeIndexRef = useRef<number | null>(null);
  let recordIdsString = '';
  if (records) {
    for (const record of records) recordIdsString += `${getRecordId(record, idAccessor)}:`;
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the record ids change
  useEffect(() => {
    lastSelectionChangeIndexRef.current = null;
  }, [recordIdsString]);

  return lastSelectionChangeIndexRef;
}
