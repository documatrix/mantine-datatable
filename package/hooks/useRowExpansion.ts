import { useMemo, useState } from 'react';
import type { DataTableIdAccessor, DataTableRowExpansionProps } from '../types';
import { getRecordId } from '../utils';
import { useStableCallback } from './useStableCallback';

function getInitiallyExpandedRecordIds<T>(
  rowExpansion: DataTableRowExpansionProps<T> | undefined,
  records: T[] | undefined,
  idAccessor: DataTableIdAccessor<T>
): unknown[] {
  if (!rowExpansion || !records) return [];
  const { trigger, allowMultiple, initiallyExpanded } = rowExpansion;
  if (trigger === 'always') return records.map((r) => getRecordId(r, idAccessor));
  if (!initiallyExpanded) return [];
  const ids = records
    .filter((record, index) => initiallyExpanded({ record, index }))
    .map((r) => getRecordId(r, idAccessor));
  return allowMultiple ? ids : ids.slice(0, 1);
}

export function useRowExpansion<T>({
  rowExpansion,
  records,
  idAccessor,
}: {
  rowExpansion?: DataTableRowExpansionProps<T>;
  records: T[] | undefined;
  idAccessor: DataTableIdAccessor<T>;
}) {
  const [uncontrolledExpandedRecordIds, setUncontrolledExpandedRecordIds] = useState<unknown[]>(() =>
    getInitiallyExpandedRecordIds(rowExpansion, records, idAccessor)
  );
  const canInitialize = !!rowExpansion && !!records?.length;
  const [initialized, setInitialized] = useState(canInitialize);
  if (!initialized && canInitialize) {
    setInitialized(true);
    setUncontrolledExpandedRecordIds(getInitiallyExpandedRecordIds(rowExpansion, records, idAccessor));
  }
  const expandedRecordIds = rowExpansion?.expanded ? rowExpansion.expanded.recordIds : uncontrolledExpandedRecordIds;
  const updateExpandedRecordIds = (update: (expandedRecordIds: unknown[]) => unknown[]) => {
    if (rowExpansion?.expanded) rowExpansion.expanded.onRecordIdsChange?.(update(rowExpansion.expanded.recordIds));
    else setUncontrolledExpandedRecordIds(update);
  };

  const enabled = !!rowExpansion;
  const { expandable, trigger, allowMultiple, collapseProps, content } = rowExpansion ?? {};

  const expandRow = useStableCallback((record: T) => {
    const recordId = getRecordId(record, idAccessor);
    updateExpandedRecordIds((ids) => (allowMultiple ? [...ids, recordId] : [recordId]));
  });
  const collapseRow = useStableCallback((record: T) => {
    const recordId = getRecordId(record, idAccessor);
    updateExpandedRecordIds((ids) => ids.filter((id) => id !== recordId));
  });

  const expandedRecordIdsSet = useMemo(() => new Set(expandedRecordIds), [expandedRecordIds]);
  const isRecordIdExpanded = (recordId: unknown) => trigger === 'always' || expandedRecordIdsSet.has(recordId);

  const expansion = useMemo(() => {
    if (!enabled) return undefined;
    return {
      expandOnClick: trigger !== 'always' && trigger !== 'never',
      isExpandable: ({ record, index }: { record: T; index: number }) => {
        if (!expandable) {
          return true;
        }
        return expandable({ record, index });
      },
      expandRow,
      collapseRow,
      collapseProps,
      content:
        ({ record, index }: { record: T; index: number }) =>
        () =>
          content!({ record, index, collapse: () => collapseRow(record) }),
    };
  }, [enabled, expandable, trigger, collapseProps, content, expandRow, collapseRow]);

  return { expansion, isRecordIdExpanded };
}

export type RowExpansionInfo<T> = ReturnType<typeof useRowExpansion<T>>['expansion'];
