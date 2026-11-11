import { useEffect, useState } from 'react';
import type { DataTableFilterCondition, DataTableFilters } from '../types/DataTableFilter';

export const EMPTY_FILTERS: DataTableFilters = {};

export function isDataTableFilters(value: unknown): value is DataTableFilters {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (conditions) =>
      Array.isArray(conditions) &&
      conditions.every(
        (condition) =>
          typeof condition === 'object' &&
          condition !== null &&
          typeof (condition as { operator?: unknown }).operator === 'string'
      )
  );
}

/**
 * Drops keys without conditions.
 */
export function compactFilters(filters: DataTableFilters): DataTableFilters {
  const entries = Object.entries(filters).filter(([, conditions]) => conditions?.length);
  return entries.length === Object.keys(filters).length ? filters : Object.fromEntries(entries);
}

export function countFilterConditions(filters: DataTableFilters | undefined) {
  return Object.values(filters ?? {}).reduce((count, conditions) => count + (conditions?.length ?? 0), 0);
}

type Storage = 'local' | 'session';

function readStoredFilters(key: string | undefined, storage: Storage) {
  if (!key || typeof window === 'undefined') return undefined;
  try {
    const raw = (storage === 'session' ? window.sessionStorage : window.localStorage).getItem(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isDataTableFilters(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredFilters(key: string | undefined, storage: Storage, filters: DataTableFilters) {
  if (!key || typeof window === 'undefined') return;
  try {
    const target = storage === 'session' ? window.sessionStorage : window.localStorage;
    if (Object.keys(filters).length) target.setItem(key, JSON.stringify(filters));
    else target.removeItem(key);
  } catch {
    // Storage can be full or disabled; filters still work for this session.
  }
}

/**
 * Holds DataTable filter state, optionally persisted in `localStorage` or `sessionStorage`.
 *
 * ```tsx
 * const { filters, setFilters } = useDataTableFilters({ key: 'employees' });
 * <DataTable filters={filters} onFiltersChange={setFilters} records={filterRecords(employees, { columns, filters })} />
 * ```
 */
export function useDataTableFilters({
  key,
  storage = 'local',
  defaultFilters = EMPTY_FILTERS,
  getInitialValueInEffect = true,
}: {
  /**
   * Storage key; filters are only persisted when set.
   */
  key?: string;
  /**
   * @default `local`
   */
  storage?: Storage;
  /**
   * Filters used when nothing is stored.
   */
  defaultFilters?: DataTableFilters;
  /**
   * If true, stored filters are read after mount, which avoids hydration mismatches with server rendering.
   * Set to false in client-only apps to start with the stored filters and skip a second fetch.
   * @default true
   */
  getInitialValueInEffect?: boolean;
} = {}) {
  const storageKey = key ? `${key}-filters` : undefined;
  const [filters, setFiltersState] = useState<DataTableFilters>(
    () => (getInitialValueInEffect ? undefined : readStoredFilters(storageKey, storage)) ?? defaultFilters
  );

  useEffect(() => {
    if (!getInitialValueInEffect) return;
    const stored = readStoredFilters(storageKey, storage);
    if (stored) setFiltersState(stored);
  }, [getInitialValueInEffect, storageKey, storage]);

  const setFilters = (next: DataTableFilters | ((current: DataTableFilters) => DataTableFilters)) =>
    setFiltersState((current) => {
      const value = compactFilters(typeof next === 'function' ? next(current) : next);
      writeStoredFilters(storageKey, storage, value);
      return value;
    });

  const setColumnFilter = (columnKey: string, conditions: DataTableFilterCondition[]) =>
    setFilters((current) => ({ ...current, [columnKey]: conditions }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const activeFilterCount = countFilterConditions(filters);

  return {
    filters,
    setFilters,
    setColumnFilter,
    clearFilters,
    activeFilterCount,
    isFiltered: activeFilterCount > 0,
  } as const;
}
