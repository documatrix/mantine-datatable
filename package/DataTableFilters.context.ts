import { createContext, use } from 'react';
import type { DataTableResolvedFilter } from './filters/config';
import type { DataTableFilterCondition, DataTableFilterOption, DataTableFilters, DataTableFilterTexts } from './types';

export type DataTableFiltersContextValue = {
  filters: DataTableFilters;
  lockedFilters: DataTableFilters | undefined;
  /**
   * Sets one column's conditions; the updater form reads the latest conditions, including updates
   * made earlier in the same event.
   */
  setColumnConditions: (
    key: string,
    conditions: DataTableFilterCondition[] | ((current: DataTableFilterCondition[]) => DataTableFilterCondition[])
  ) => void;
  clearFilters: () => void;
  texts: DataTableFilterTexts;
  locale: string | undefined;
  display: 'popover' | 'row';
  /**
   * Options seen per filter key (static and loaded), so pills and chips can show labels.
   */
  knownOptions: Record<string, DataTableFilterOption[]>;
  rememberOptions: (key: string, options: DataTableFilterOption[]) => void;
};

export const DataTableFiltersContext = createContext<DataTableFiltersContextValue | null>(null);

export function useDataTableFiltersContext() {
  const context = use(DataTableFiltersContext);
  if (!context) throw new Error('DataTable filter components must be rendered inside a DataTable');
  return context;
}

/**
 * The filter whose editor is open, for pickers rendered through `renderPicker`.
 */
export const DataTableFilterEditorContext = createContext<DataTableResolvedFilter | null>(null);

export function useDataTableFilterEditorContext() {
  const filter = use(DataTableFilterEditorContext);
  if (!filter) throw new Error('DataTable filter pickers must be rendered inside a filter editor');
  return filter;
}
