import type { DataTableColumn } from '../types/DataTableColumn';
import type { DataTableDefaultColumnProps } from '../types/DataTableDefaultColumnProps';
import type { DataTableFilterCondition, DataTableFilterScalar, DataTableFilters } from '../types/DataTableFilter';
import { getValueAtPath } from '../utils';
import { type DataTableResolvedFilter, getRecordFilterValue, resolveColumnFilters } from './config';
import { resolveDatePeriod, toDate } from './dates';
import { foldText, globToParts, isWildcard } from './syntax';

// Wildcard matching with a single backtrack point, so untrusted patterns can't cause exponential work.
function compileGlob(pattern: string, caseSensitive?: boolean) {
  const tokens: (string | { wildcard: '*' | '?' })[] = [];
  for (const part of globToParts(foldText(pattern, caseSensitive))) {
    if (isWildcard(part)) tokens.push({ wildcard: part.wildcard });
    else tokens.push(...part.literal.split(''));
  }
  const isStar = (index: number) => {
    const token = tokens[index];
    return typeof token === 'object' && token.wildcard === '*';
  };
  return (text: string) => {
    let t = 0;
    let p = 0;
    let star = -1;
    let mark = 0;
    while (t < text.length) {
      const token = tokens[p];
      if (token !== undefined && !isStar(p) && (typeof token === 'object' || token === text[t])) {
        t++;
        p++;
      } else if (isStar(p)) {
        star = p++;
        mark = t;
      } else if (star !== -1) {
        p = star + 1;
        t = ++mark;
      } else {
        return false;
      }
    }
    while (isStar(p)) p++;
    return p === tokens.length;
  };
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

function compare<V>(
  actual: V,
  operator: DataTableFilterCondition['operator'],
  expected: V,
  cmp: (a: V, b: V) => number
): boolean {
  const result = cmp(actual, expected);
  switch (operator) {
    case 'equals':
      return result === 0;
    case 'gt':
      return result > 0;
    case 'gte':
      return result >= 0;
    case 'lt':
      return result < 0;
    case 'lte':
      return result <= 0;
    default:
      return false;
  }
}

function inRange<V>(actual: V, range: [V | null, V | null], cmp: (a: V, b: V) => number) {
  const [from, to] = range;
  return (from === null || cmp(actual, from) >= 0) && (to === null || cmp(actual, to) <= 0);
}

type ValueMatcher = (value: unknown) => boolean;

const compareText = (a: string, b: string) => a.localeCompare(b);
const compareNumber = (a: number, b: number) => a - b;

function compileTextTest(condition: DataTableFilterCondition, fold: (text: string) => string, caseSensitive?: boolean) {
  const { operator } = condition;
  if (operator === 'like') {
    return compileGlob(String(condition.value), caseSensitive);
  }
  const expected = fold(String(condition.value ?? ''));
  switch (operator) {
    case 'contains':
      return (actual: string) => actual.includes(expected);
    case 'startsWith':
      return (actual: string) => actual.startsWith(expected);
    case 'endsWith':
      return (actual: string) => actual.endsWith(expected);
    default:
      return (actual: string) => compare(actual, operator, expected, compareText);
  }
}

function compileText(condition: DataTableFilterCondition, caseSensitive?: boolean): ValueMatcher {
  const fold = (text: string) => foldText(text, caseSensitive);
  const test = compileTextTest(condition, fold, caseSensitive);
  return (value) => {
    if (typeof value === 'object' && value !== null) return false;
    return test(fold(String(value ?? '')));
  };
}

function compileNumber(condition: DataTableFilterCondition): ValueMatcher | null {
  let test: (actual: number) => boolean;
  if (condition.operator === 'between') {
    if (!Array.isArray(condition.value)) return null;
    const [from, to] = condition.value;
    const range: [number | null, number | null] = [
      from === null ? null : Number(from),
      to === null ? null : Number(to),
    ];
    test = (actual) => inRange(actual, range, compareNumber);
  } else {
    const expected = Number(condition.value);
    test = (actual) => compare(actual, condition.operator, expected, compareNumber);
  }
  return (value) => {
    const actual = toNumber(value);
    return !Number.isNaN(actual) && test(actual);
  };
}

function compileDate(condition: DataTableFilterCondition, now: Date, weekStartsOn?: number): ValueMatcher | null {
  const range = getDateConditionRange(condition, now, weekStartsOn);
  if (!range) return null;
  const [from, to] = range;
  return (value) => {
    const actual = toDate(value);
    return !!actual && (!from || actual >= from) && (!to || actual <= to);
  };
}

function matchBoolean(value: unknown, condition: DataTableFilterCondition) {
  const actual = typeof value === 'string' ? value === 'true' : typeof value === 'number' ? value !== 0 : value;
  return typeof actual === 'boolean' && actual === condition.value;
}

function compileScalar(
  condition: DataTableFilterCondition,
  filter: DataTableResolvedFilter,
  now: Date
): ValueMatcher | null {
  switch (filter.type) {
    case 'number':
    case 'duration':
      return compileNumber(condition);
    case 'date':
      return compileDate(condition, now, filter.weekStartsOn);
    case 'boolean':
      return (value) => matchBoolean(value, condition);
    case 'select':
      if (condition.operator === 'equals') {
        // A value that is one of the declared options is an identity; anything else is typed text.
        const exact = filter.caseSensitive || filter.options?.some((option) => option.value === condition.value);
        const expected = foldText(String(condition.value), exact);
        return (value) => value === condition.value || foldText(String(value), exact) === expected;
      }
      return compileText(condition, filter.caseSensitive);
    case 'text':
      return compileText(condition, filter.caseSensitive);
    default:
      return compileText(condition);
  }
}

function compileCondition(
  condition: DataTableFilterCondition,
  filter: DataTableResolvedFilter,
  now: Date
): ValueMatcher | null {
  if (condition.operator === 'empty') return isEmptyValue;
  const matchScalar = compileScalar(condition, filter, now);
  if (!matchScalar) return null;
  return (value) => {
    if (Array.isArray(value)) return value.some((item) => matchScalar(item));
    return value !== null && value !== undefined && matchScalar(value);
  };
}

function compileConditions(
  conditions: DataTableFilterCondition[],
  filter: DataTableResolvedFilter,
  now: Date
): ValueMatcher {
  const positive: ValueMatcher[] = [];
  const negative: ValueMatcher[] = [];
  for (const condition of conditions) {
    const matcher = compileCondition(condition, filter, now);
    if (matcher) (condition.negate ? negative : positive).push(matcher);
  }
  return (value) =>
    !negative.some((matcher) => matcher(value)) && (!positive.length || positive.some((matcher) => matcher(value)));
}

/**
 * Checks a value against one column's conditions: plain conditions are OR-ed, negated conditions are AND-ed.
 * Date conditions whose tokens can't be resolved and malformed `between` conditions are ignored.
 */
export function matchesFilterConditions(
  value: unknown,
  conditions: DataTableFilterCondition[],
  filter: DataTableResolvedFilter,
  now = new Date()
) {
  return compileConditions(conditions, filter, now)(value);
}

export type DataTableFilterRecordsOptions<T> = {
  /**
   * Column definitions; their `filter` config and accessors decide how conditions apply.
   */
  columns: DataTableColumn<T>[];
  /**
   * The table's `defaultColumnProps`, when they carry a `filter`.
   */
  defaultColumnProps?: DataTableDefaultColumnProps<T>;
  filters?: DataTableFilters;
  lockedFilters?: DataTableFilters;
  /**
   * Free-text search; every whitespace-separated word has to appear in one of the searched columns.
   */
  search?: string;
  /**
   * Accessors searched by `search`; defaults to all columns.
   */
  searchAccessors?: string[];
  /**
   * Reference time for relative dates.
   */
  now?: Date;
};

/**
 * Filters records on the client. Returns the same array when nothing filters.
 */
export function filterRecords<T>(records: T[], options: DataTableFilterRecordsOptions<T>): T[] {
  const { columns, defaultColumnProps, filters, lockedFilters, search, searchAccessors, now = new Date() } = options;
  const configs = resolveColumnFilters(columns, defaultColumnProps);
  const checks: ((record: T) => boolean)[] = [];

  for (const set of [lockedFilters, filters]) {
    for (const [key, conditions] of Object.entries(set ?? {})) {
      const filter = configs.get(key);
      if (!filter || !conditions?.length) continue;
      if (filter.type === 'custom') {
        if (filter.match) checks.push((record) => filter.match!(record, conditions));
        continue;
      }
      const matches = compileConditions(conditions, filter, now);
      checks.push((record) => matches(getRecordFilterValue(record, filter)));
    }
  }

  const words = search ? foldText(search).split(/\s+/).filter(Boolean) : [];
  if (words.length) {
    const accessors = searchAccessors ?? columns.map(({ accessor }) => String(accessor));
    checks.push((record) => {
      const haystack = accessors
        .flatMap((accessor) => getValueAtPath(record, accessor) as unknown)
        .filter((value) => typeof value === 'string' || typeof value === 'number')
        .map((value) => foldText(String(value)))
        .join('\u0000');
      return words.every((word) => haystack.includes(word));
    });
  }

  return checks.length ? records.filter((record) => checks.every((check) => check(record))) : records;
}

/**
 * Inclusive range of instants a date condition covers; `null` bounds are open.
 * Returns `null` when a token can't be resolved or the operator doesn't apply to dates.
 */
export function getDateConditionRange(
  condition: DataTableFilterCondition,
  now: Date,
  weekStartsOn: number | undefined
): [Date | null, Date | null] | null {
  const period = (token: DataTableFilterScalar) => resolveDatePeriod(String(token), now, weekStartsOn);
  const last = (date: Date) => new Date(date.getTime() - 1);
  if (condition.operator === 'between') {
    if (!Array.isArray(condition.value)) return null;
    const [from, to] = condition.value;
    const start = from === null ? null : period(from);
    const end = to === null ? null : period(to);
    if ((from !== null && !start) || (to !== null && !end)) return null;
    return [start?.start ?? null, end ? last(end.end) : null];
  }
  const p = period(condition.value as DataTableFilterScalar);
  if (!p) return null;
  switch (condition.operator) {
    case 'equals':
      return [p.start, last(p.end)];
    case 'gt':
      return [p.end, null];
    case 'gte':
      return [p.start, null];
    case 'lt':
      return [null, last(p.start)];
    case 'lte':
      return [null, last(p.end)];
    default:
      return null;
  }
}

function resolveDateCondition(
  condition: DataTableFilterCondition,
  now: Date,
  weekStartsOn: number | undefined
): DataTableFilterCondition | null {
  if (condition.operator === 'empty') return condition;
  const range = getDateConditionRange(condition, now, weekStartsOn);
  if (!range) return null;
  return {
    operator: 'between',
    value: [range[0]?.toISOString() ?? null, range[1]?.toISOString() ?? null],
    ...(condition.negate ? { negate: true } : null),
  };
}

/**
 * Prepares filters for a server: date conditions become inclusive `between` ranges of ISO timestamps,
 * so relative dates like `-7d` are evaluated now. Date conditions whose tokens can't be resolved are dropped,
 * as `filterRecords` ignores them. Other conditions are returned unchanged.
 */
export function resolveFilters<T>(
  filters: DataTableFilters,
  {
    columns,
    defaultColumnProps,
    now = new Date(),
  }: { columns: DataTableColumn<T>[]; defaultColumnProps?: DataTableDefaultColumnProps<T>; now?: Date }
): DataTableFilters {
  const configs = resolveColumnFilters(columns, defaultColumnProps);
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, conditions]) => {
        const filter = configs.get(key);
        if (filter?.type !== 'date' || !conditions) return [key, conditions] as const;
        const resolved = conditions.map((condition) => resolveDateCondition(condition, now, filter.weekStartsOn));
        return [key, resolved.filter((condition) => condition !== null)] as const;
      })
      .filter(([, conditions]) => conditions?.length)
  );
}

/**
 * Converts a text condition to an SQL `LIKE` pattern with `\` as escape character
 * (use `LIKE ? ESCAPE '\'`). Returns `undefined` for operators that aren't patterns.
 */
export function toSqlLikePattern(condition: DataTableFilterCondition): string | undefined {
  const value = String(condition.value ?? '');
  const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');
  switch (condition.operator) {
    case 'contains':
      return `%${escapeLike(value)}%`;
    case 'startsWith':
      return `${escapeLike(value)}%`;
    case 'endsWith':
      return `%${escapeLike(value)}`;
    case 'like': {
      let pattern = '';
      for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (ch === '\\' && i + 1 < value.length) pattern += escapeLike(value[++i]);
        else if (ch === '*') pattern += '%';
        else if (ch === '?') pattern += '_';
        else pattern += escapeLike(ch);
      }
      return pattern;
    }
    default:
      return undefined;
  }
}

/**
 * Returns the literal text fragments of positive text conditions, for highlighting matches in custom renders.
 */
export function getFilterHighlights(conditions: DataTableFilterCondition[] | undefined): string[] {
  const terms = new Set<string>();
  for (const condition of conditions ?? []) {
    if (condition.negate || typeof condition.value !== 'string') continue;
    if (condition.operator === 'like') {
      for (const part of globToParts(condition.value)) {
        if (!isWildcard(part) && part.literal.length > 1) terms.add(part.literal);
      }
    } else if (['contains', 'startsWith', 'endsWith', 'equals'].includes(condition.operator) && condition.value) {
      terms.add(condition.value);
    }
  }
  return [...terms];
}
