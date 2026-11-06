import { createContext, use } from 'react';
import type { DataTableFilterCondition, DataTableFilterOption, DataTableFilters, DataTableFilterTexts } from './types';

export type DataTableFiltersContextValue = {
  filters: DataTableFilters;
  lockedFilters: DataTableFilters | undefined;
  setColumnConditions: (key: string, conditions: DataTableFilterCondition[]) => void;
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
