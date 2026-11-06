import { isValidElement } from 'react';
import type { DataTableColumn } from '../types/DataTableColumn';
import type {
  DataTableColumnFilter,
  DataTableDatePreset,
  DataTableFilterOperator,
  DataTableFilterOption,
  DataTableFilterTexts,
  DataTableFilterType,
} from '../types/DataTableFilter';
import { getValueAtPath, humanize } from '../utils';

export type DataTableResolvedFilter<T = unknown> = DataTableColumnFilter<T> & {
  key: string;
  accessor: string;
  label: string;
  operators: DataTableFilterOperator[];
  defaultOperator: DataTableFilterOperator;
};

const TEXT_OPERATORS: DataTableFilterOperator[] = ['contains', 'startsWith', 'endsWith', 'equals', 'like', 'empty'];
const RANGE_OPERATORS: DataTableFilterOperator[] = ['equals', 'gt', 'gte', 'lt', 'lte', 'between', 'empty'];

const DEFAULT_OPERATORS: Record<DataTableFilterType, DataTableFilterOperator[]> = {
  text: TEXT_OPERATORS,
  number: RANGE_OPERATORS,
  duration: RANGE_OPERATORS,
  date: RANGE_OPERATORS,
  boolean: ['equals', 'empty'],
  select: ['equals', 'contains', 'startsWith', 'endsWith', 'like', 'empty'],
  custom: [...TEXT_OPERATORS, 'gt', 'gte', 'lt', 'lte', 'between'],
};

export function isColumnFilterConfig<T>(filter: DataTableColumn<T>['filter']): filter is DataTableColumnFilter<T> {
  return (
    typeof filter === 'object' &&
    filter !== null &&
    !isValidElement(filter) &&
    !(Symbol.iterator in filter) &&
    !('then' in filter) &&
    typeof (filter as { type?: unknown }).type === 'string'
  );
}

function getDefaultOperator(type: DataTableFilterType, operators: DataTableFilterOperator[]) {
  const preferred: DataTableFilterOperator = type === 'text' ? 'contains' : 'equals';
  if (operators.includes(preferred)) return preferred;
  return operators.find((operator) => operator !== 'between' && operator !== 'empty') ?? preferred;
}

export function resolveColumnFilter<T>(column: DataTableColumn<T>): DataTableResolvedFilter<T> | undefined {
  const { filter, accessor, title } = column;
  if (!isColumnFilterConfig(filter)) return undefined;
  const accessorString = String(accessor);
  const operators = filter.operators ?? DEFAULT_OPERATORS[filter.type];
  return {
    ...filter,
    key: filter.key ?? accessorString,
    accessor: accessorString,
    label: filter.label ?? (typeof title === 'string' ? title : humanize(accessorString)),
    operators,
    defaultOperator: filter.defaultOperator ?? getDefaultOperator(filter.type, operators),
  } as DataTableResolvedFilter<T>;
}

export function resolveColumnFilters<T>(columns: DataTableColumn<T>[]) {
  const map = new Map<string, DataTableResolvedFilter<T>>();
  for (const column of columns) {
    const resolved = resolveColumnFilter(column);
    if (resolved && !map.has(resolved.key)) map.set(resolved.key, resolved);
  }
  return map;
}

/**
 * Filter used for keys in `DataTableFilters` that no column declares, so their conditions can still be shown.
 */
export function getFallbackFilter(key: string): DataTableResolvedFilter {
  return {
    type: 'text',
    key,
    accessor: key,
    label: humanize(key),
    operators: DEFAULT_OPERATORS.custom,
    defaultOperator: 'contains',
  };
}

export function mergeOptions(...lists: (DataTableFilterOption[] | undefined)[]) {
  const seen = new Set<string>();
  const merged: DataTableFilterOption[] = [];
  for (const option of lists.flat()) {
    if (!option) continue;
    const id = JSON.stringify(option.value);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(option);
  }
  return merged;
}

export function getRecordFilterValue<T>(record: T, filter: DataTableResolvedFilter<T>) {
  return filter.getValue ? filter.getValue(record) : getValueAtPath(record, filter.accessor);
}

export function getDefaultDatePresets(texts: DataTableFilterTexts): DataTableDatePreset[] {
  const p = texts.presets;
  return [
    { label: p.today, condition: { operator: 'equals', value: '0d' } },
    { label: p.yesterday, condition: { operator: 'equals', value: '-1d' } },
    { label: p.last7Days, condition: { operator: 'between', value: ['-6d', '0d'] } },
    { label: p.last30Days, condition: { operator: 'between', value: ['-29d', '0d'] } },
    { label: p.thisWeek, condition: { operator: 'equals', value: '0w' } },
    { label: p.lastWeek, condition: { operator: 'equals', value: '-1w' } },
    { label: p.thisMonth, condition: { operator: 'equals', value: '0mo' } },
    { label: p.lastMonth, condition: { operator: 'equals', value: '-1mo' } },
    { label: p.thisYear, condition: { operator: 'equals', value: '0y' } },
    { label: p.lastYear, condition: { operator: 'equals', value: '-1y' } },
  ];
}
