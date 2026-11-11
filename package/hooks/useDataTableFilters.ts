import { useEffect, useState } from 'react';
import { sanitizeFilters } from '../filters/sanitize';
import type { DataTableFilterCondition, DataTableFilters } from '../types/DataTableFilter';

export const EMPTY_FILTERS: DataTableFilters = {};

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
    return sanitizeFilters(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function writeStoredFilters(key: string | undefined, storage: Storage, filters: DataTableFilters) {
  if (!key || typeof window === 'undefined') return;
  try {
    // Empty filters are stored too: a missing item means "never set" and falls back to `defaultFilters`.
    (storage === 'session' ? window.sessionStorage : window.localStorage).setItem(key, JSON.stringify(filters));
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

  const source = storageKey ? `${storage}:${storageKey}` : undefined;
  const [loadedSource, setLoadedSource] = useState(source);
  if (source !== loadedSource) {
    setLoadedSource(source);
    const stored = readStoredFilters(storageKey, storage);
    // Filters made without a key are kept when one appears; switching between keys starts from the new key's state.
    if (stored || (source && loadedSource)) setFiltersState(stored ?? defaultFilters);
  }

  useEffect(() => {
    if (!getInitialValueInEffect) return;
    const stored = readStoredFilters(storageKey, storage);
    if (stored) {
      setFiltersState((current) => (JSON.stringify(current) === JSON.stringify(stored) ? current : stored));
    }
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
