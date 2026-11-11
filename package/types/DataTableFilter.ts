/**
 * Operators a filter condition can use.
 * Text operators compare case- and accent-insensitively unless the column filter sets `caseSensitive`.
 * `gt`, `gte`, `lt` and `lte` compare text alphabetically; `between` applies to number, duration and date filters.
 * Date operators compare against the whole period of the value (`2026-03` is the entire month).
 */
export type DataTableFilterOperator =
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'like'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'empty';

export type DataTableFilterScalar = string | number | boolean;

/**
 * Inclusive range used by the `between` operator. Either bound may be `null` for an open range.
 */
export type DataTableFilterRange = [DataTableFilterScalar | null, DataTableFilterScalar | null];

/**
 * A single filter condition, rendered as one pill.
 *
 * Value types per filter type:
 * - `text`: the literal string; for `like` a glob pattern (`*` any characters, `?` one character,
 *   `\` escapes the next character)
 * - `number` / `duration`: a number (durations in the filter's `unit`)
 * - `date`: an ISO date token (`2026`, `2026-03`, `2026-03-05`, `2026-03-05T10:30`), `now`, or a relative
 *   offset (`0d` today, `-1d` yesterday, `-7d`, `0w` this week, `-1mo` last month, `0y` this year, `-2h`)
 * - `boolean`: `true` / `false`
 * - `select`: the option value
 */
export type DataTableFilterCondition = {
  operator: DataTableFilterOperator;
  value?: DataTableFilterScalar | DataTableFilterRange;
  /**
   * Inverts the condition. Within one column, plain conditions are OR-ed and negated conditions are AND-ed:
   * `A, B, !C` means "A or B, but not C". Different columns are AND-ed.
   */
  negate?: boolean;
};

/**
 * Filter state, keyed by the column filter `key` (the column accessor by default).
 * Plain JSON, so it can be persisted, put into a URL or sent to a server as is.
 */
export type DataTableFilters = Record<string, DataTableFilterCondition[]>;

export type DataTableFilterType = 'text' | 'number' | 'duration' | 'date' | 'boolean' | 'select' | 'custom';

export type DataTableFilterOption = {
  /**
   * Option value. `null` stands for "no value" and is stored as an `empty` condition.
   */
  value: DataTableFilterScalar | null;
  /**
   * Label shown in the dropdown and in pills; defaults to the stringified value.
   */
  label?: string;
  /**
   * Optional number of matching records, shown next to the option.
   */
  count?: number;
};

export type DataTableDatePreset = {
  label: string;
  condition: DataTableFilterCondition;
};

export type DataTableFilterEditorRenderProps = {
  conditions: DataTableFilterCondition[];
  setConditions: (conditions: DataTableFilterCondition[]) => void;
  addCondition: (condition: DataTableFilterCondition) => void;
  close: () => void;
};

type DataTableFilterBase<T> = {
  /**
   * Key used in `DataTableFilters`; defaults to the column accessor.
   */
  key?: string;

  /**
   * Label used in filter chips and the filter popover; defaults to the column title, if it is a string,
   * or the humanized accessor.
   */
  label?: string;

  /**
   * Input placeholder.
   */
  placeholder?: string;

  /**
   * Restricts the operators users can apply; defaults depend on the filter type.
   */
  operators?: DataTableFilterOperator[];

  /**
   * Operator applied to a value typed without an operator prefix.
   * @default `contains` for text filters, `equals` otherwise; the first single-value operator in `operators` if those aren't allowed
   */
  defaultOperator?: DataTableFilterOperator;

  /**
   * Value used when filtering records with `filterRecords`; defaults to the value at the column accessor.
   */
  getValue?(record: T): unknown;
};

export type DataTableTextFilter<T> = DataTableFilterBase<T> & {
  type: 'text';
  /**
   * If true, text comparisons respect case and accents.
   */
  caseSensitive?: boolean;
};

export type DataTableNumberFilter<T> = DataTableFilterBase<T> & {
  type: 'number';
  /**
   * Options used to format numbers in pills.
   */
  formatOptions?: Intl.NumberFormatOptions;
};

export type DataTableDurationFilter<T> = DataTableFilterBase<T> & {
  type: 'duration';
  /**
   * Unit of the record values and of numbers typed without a unit.
   * @default `ms`
   */
  unit?: DataTableDurationUnit;
};

export type DataTableDurationUnit = 'ms' | 's' | 'min' | 'h' | 'd';

export type DataTableDateFilter<T> = DataTableFilterBase<T> & {
  type: 'date';
  /**
   * If true, `DataTableFilterCalendar` also asks for start and end times.
   */
  withTime?: boolean;
  /**
   * Presets offered while the input is empty; `false` hides them.
   */
  presets?: DataTableDatePreset[] | false;
  /**
   * First day of the week for week offsets (`0w`, `-1w`); 0 is Sunday.
   * @default 1
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Renders a picker below the input in the filter popover, e.g. `DataTableFilterCalendar` from
   * `@neeyo/mantine-datatable/dates`, or your own. In the filter row, it opens from an icon next to the input.
   */
  renderPicker?: (props: DataTableFilterEditorRenderProps) => React.ReactNode;
};

export type DataTableBooleanFilter<T> = DataTableFilterBase<T> & {
  type: 'boolean';
};

export type DataTableSelectFilter<T> = DataTableFilterBase<T> & {
  type: 'select';
  /**
   * Static options.
   */
  options?: DataTableFilterOption[];
  /**
   * Loads options for the typed search text, e.g. distinct column values from a server.
   * Called with an empty string when the dropdown opens.
   */
  loadOptions?: (search: string, signal: AbortSignal) => Promise<DataTableFilterOption[]>;
  /**
   * Number of options shown before a "Show all" entry.
   * @default 100
   */
  optionsLimit?: number;
  /**
   * If true, typed values that match no option are accepted as text conditions.
   * @default true
   */
  allowCustomValues?: boolean;
  /**
   * If true, text comparisons respect case and accents. Values listed in `options` always match exactly;
   * set this when options from `loadOptions` differ only by case or accents.
   */
  caseSensitive?: boolean;
};

export type DataTableCustomFilter<T> = DataTableFilterBase<T> & {
  type: 'custom';
  /**
   * Renders the editor shown in the filter popover.
   */
  render: (props: DataTableFilterEditorRenderProps) => React.ReactNode;
  /**
   * Formats a condition for pills and chips.
   */
  format?: (condition: DataTableFilterCondition) => string;
  /**
   * Decides whether a record passes this column's conditions in `filterRecords`; records pass when omitted.
   */
  match?(record: T, conditions: DataTableFilterCondition[]): boolean;
};

export type DataTableColumnFilter<T = Record<string, unknown>> =
  | DataTableTextFilter<T>
  | DataTableNumberFilter<T>
  | DataTableDurationFilter<T>
  | DataTableDateFilter<T>
  | DataTableBooleanFilter<T>
  | DataTableSelectFilter<T>
  | DataTableCustomFilter<T>;

type DataTableFilterOperatorTexts = Record<
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'notStartsWith'
  | 'endsWith'
  | 'notEndsWith'
  | 'equals'
  | 'notEquals'
  | 'like'
  | 'notLike'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'notBetween'
  | 'not',
  (value: string, to?: string) => string
>;

export type DataTableFilterTexts = {
  placeholder: string;
  clear: string;
  clearAll: string;
  clearFilters: string;
  noMatches: string;
  noOptions: string;
  loading: string;
  locked: string;
  editFilter: (label: string) => string;
  removeCondition: (label: string) => string;
  showAll: (count: number) => string;
  addConditions: (count: number) => string;
  hint: string;
  syntax: string;
  helpHint: string;
  openCalendar: string;
  addRange: string;
  fromTime: string;
  toTime: string;
  empty: string;
  notEmpty: string;
  now: string;
  yes: string;
  no: string;
  lastDays: (count: number) => string;
  operators: DataTableFilterOperatorTexts;
  dateOperators: Pick<DataTableFilterOperatorTexts, 'equals' | 'notEquals' | 'gt' | 'gte' | 'lt' | 'lte'>;
  errors: {
    missingValue: string;
    unterminatedQuote: string;
    invalidNumber: string;
    invalidDuration: string;
    invalidDate: string;
    invalidBoolean: string;
    unknownOption: string;
    emptyRange: string;
    unsupportedOperator: (operator: string) => string;
  };
  presets: {
    today: string;
    yesterday: string;
    last7Days: string;
    last30Days: string;
    thisWeek: string;
    lastWeek: string;
    thisMonth: string;
    lastMonth: string;
    thisYear: string;
    lastYear: string;
  };
  /**
   * Syntax examples per filter type; clicking an example puts it into the input.
   */
  help: Record<Exclude<DataTableFilterType, 'custom'>, [example: string, description: string][]>;
};

export type DataTableFilterTextsInput = Partial<
  Omit<DataTableFilterTexts, 'operators' | 'dateOperators' | 'errors' | 'presets' | 'help'>
> & {
  operators?: Partial<DataTableFilterTexts['operators']>;
  dateOperators?: Partial<DataTableFilterTexts['dateOperators']>;
  errors?: Partial<DataTableFilterTexts['errors']>;
  presets?: Partial<DataTableFilterTexts['presets']>;
  help?: Partial<DataTableFilterTexts['help']>;
};

export type DataTableFilterProps = {
  /**
   * Current filters (controlled). Pair with `onFiltersChange`, or use `useDataTableFilters`.
   */
  filters?: DataTableFilters;

  /**
   * Initial filters when `filters` is not controlled.
   */
  defaultFilters?: DataTableFilters;

  /**
   * Called when the user changes filters.
   */
  onFiltersChange?: (filters: DataTableFilters) => void;

  /**
   * Filters set by the application. They are shown as locked pills and chips and can't be removed by the user;
   * apply them yourself (e.g. pass them to `filterRecords` as `lockedFilters`).
   */
  lockedFilters?: DataTableFilters;

  /**
   * Where users edit column filters: in a popover opened from the header (`popover`) or in a row of
   * inputs below the column titles (`row`).
   * @default `popover`
   */
  filterDisplay?: 'popover' | 'row';

  /**
   * If true, a row below the header lists all active filters as chips, including filters on hidden columns.
   */
  withFilterChips?: boolean;

  /**
   * If true and the table is paginated, changing filters goes back to the first page.
   * @default true
   */
  resetPageOnFilterChange?: boolean;

  /**
   * If true, text matching active text filters is highlighted in cells without a custom `render`.
   * Columns whose filter sets `getValue` are not highlighted, since the cell doesn't show the filtered value.
   */
  highlightFilterMatches?: boolean;

  /**
   * Overrides for the filter UI texts.
   */
  filterTexts?: DataTableFilterTextsInput;

  /**
   * Locale used to format numbers and dates in pills; defaults to the browser locale.
   */
  filterLocale?: string;
};
