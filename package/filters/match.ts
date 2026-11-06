import type { DataTableColumn } from '../types/DataTableColumn';
import type {
  DataTableFilterCondition,
  DataTableFilterRange,
  DataTableFilterScalar,
  DataTableFilters,
} from '../types/DataTableFilter';
import { getValueAtPath } from '../utils';
import { type DataTableResolvedFilter, getRecordFilterValue, resolveColumnFilters } from './config';
import { resolveDatePeriod, toDate } from './dates';
import { foldText } from './syntax';

function globToRegExp(pattern: string, caseSensitive?: boolean) {
  const folded = foldText(pattern, caseSensitive);
  let source = '';
  for (let i = 0; i < folded.length; i++) {
    const ch = folded[i];
    if (ch === '\\' && i + 1 < folded.length) source += folded[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    else if (ch === '*') source += '.*';
    else if (ch === '?') source += '.';
    else source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`, 's');
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

function matchText(value: unknown, condition: DataTableFilterCondition, caseSensitive?: boolean) {
  if (typeof value === 'object' && value !== null) return false;
  const actual = foldText(String(value ?? ''), caseSensitive);
  if (condition.operator === 'like') return globToRegExp(String(condition.value), caseSensitive).test(actual);
  if (condition.operator === 'between') {
    const [from, to] = condition.value as DataTableFilterRange;
    const fold = (bound: DataTableFilterScalar | null) =>
      bound === null ? null : foldText(String(bound), caseSensitive);
    return inRange(actual, [fold(from), fold(to)], (a, b) => a.localeCompare(b));
  }
  const expected = foldText(String(condition.value ?? ''), caseSensitive);
  switch (condition.operator) {
    case 'contains':
      return actual.includes(expected);
    case 'startsWith':
      return actual.startsWith(expected);
    case 'endsWith':
      return actual.endsWith(expected);
    default:
      return compare(actual, condition.operator, expected, (a, b) => a.localeCompare(b));
  }
}

function matchNumber(value: unknown, condition: DataTableFilterCondition) {
  const actual = toNumber(value);
  if (Number.isNaN(actual)) return false;
  const cmp = (a: number, b: number) => a - b;
  if (condition.operator === 'between') {
    const [from, to] = condition.value as DataTableFilterRange;
    return inRange(actual, [from === null ? null : Number(from), to === null ? null : Number(to)], cmp);
  }
  return compare(actual, condition.operator, Number(condition.value), cmp);
}

function matchDate(value: unknown, condition: DataTableFilterCondition, now: Date, weekStartsOn?: number) {
  const actual = toDate(value);
  if (!actual) return false;
  const period = (token: DataTableFilterScalar) => resolveDatePeriod(String(token), now, weekStartsOn);
  if (condition.operator === 'between') {
    const [from, to] = condition.value as DataTableFilterRange;
    const start = from === null ? null : period(from);
    const end = to === null ? null : period(to);
    if ((from !== null && !start) || (to !== null && !end)) return false;
    return (!start || actual >= start.start) && (!end || actual < end.end);
  }
  const p = period(condition.value as DataTableFilterScalar);
  if (!p) return false;
  switch (condition.operator) {
    case 'equals':
      return actual >= p.start && actual < p.end;
    case 'gt':
      return actual >= p.end;
    case 'gte':
      return actual >= p.start;
    case 'lt':
      return actual < p.start;
    case 'lte':
      return actual < p.end;
    default:
      return false;
  }
}

function matchBoolean(value: unknown, condition: DataTableFilterCondition) {
  const actual = typeof value === 'string' ? value === 'true' : typeof value === 'number' ? value !== 0 : value;
  return typeof actual === 'boolean' && actual === condition.value;
}

function matchScalar(value: unknown, condition: DataTableFilterCondition, filter: DataTableResolvedFilter, now: Date) {
  switch (filter.type) {
    case 'number':
    case 'duration':
      return matchNumber(value, condition);
    case 'date':
      return matchDate(value, condition, now, filter.weekStartsOn);
    case 'boolean':
      return matchBoolean(value, condition);
    case 'select':
      if (condition.operator === 'equals')
        return value === condition.value || String(value) === String(condition.value);
      return matchText(value, condition, filter.caseSensitive);
    case 'text':
      return matchText(value, condition, filter.caseSensitive);
    default:
      return matchText(value, condition);
  }
}

function matchValue(value: unknown, condition: DataTableFilterCondition, filter: DataTableResolvedFilter, now: Date) {
  if (condition.operator === 'empty') return isEmptyValue(value);
  if (Array.isArray(value)) return value.some((item) => matchScalar(item, condition, filter, now));
  if (value === null || value === undefined) return false;
  return matchScalar(value, condition, filter, now);
}

/**
 * Checks a value against one column's conditions: plain conditions are OR-ed, negated conditions are AND-ed.
 */
export function matchesFilterConditions(
  value: unknown,
  conditions: DataTableFilterCondition[],
  filter: DataTableResolvedFilter,
  now = new Date()
) {
  let hasPositive = false;
  let positiveMatched = false;
  for (const condition of conditions) {
    const matched = matchValue(value, condition, filter, now);
    if (condition.negate) {
      if (matched) return false;
    } else {
      hasPositive = true;
      positiveMatched ||= matched;
    }
  }
  return !hasPositive || positiveMatched;
}

export type DataTableFilterRecordsOptions<T> = {
  /**
   * Column definitions; their `filter` config and accessors decide how conditions apply.
   */
  columns: DataTableColumn<T>[];
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
  const { columns, filters, lockedFilters, search, searchAccessors, now = new Date() } = options;
  const configs = resolveColumnFilters(columns);
  const checks: ((record: T) => boolean)[] = [];

  for (const set of [lockedFilters, filters]) {
    for (const [key, conditions] of Object.entries(set ?? {})) {
      const filter = configs.get(key);
      if (!filter || !conditions?.length) continue;
      if (filter.type === 'custom') {
        if (filter.match) checks.push((record) => filter.match!(record, conditions));
        continue;
      }
      checks.push((record) => matchesFilterConditions(getRecordFilterValue(record, filter), conditions, filter, now));
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
 */
export function getDateConditionRange(
  condition: DataTableFilterCondition,
  now: Date,
  weekStartsOn: number | undefined
): [Date | null, Date | null] {
  const period = (token: DataTableFilterScalar | null) =>
    token === null ? null : resolveDatePeriod(String(token), now, weekStartsOn);
  const last = (date: Date) => new Date(date.getTime() - 1);
  let range: [Date | null, Date | null] = [null, null];
  if (condition.operator === 'between') {
    const [from, to] = condition.value as DataTableFilterRange;
    const start = period(from);
    const end = period(to);
    range = [start?.start ?? null, end ? last(end.end) : null];
  } else {
    const p = period(condition.value as DataTableFilterScalar);
    if (p) {
      range = {
        equals: [p.start, last(p.end)],
        gt: [p.end, null],
        gte: [p.start, null],
        lt: [null, last(p.start)],
        lte: [null, last(p.end)],
      }[condition.operator as 'equals' | 'gt' | 'gte' | 'lt' | 'lte'] as [Date | null, Date | null];
    }
  }
  return range;
}

function resolveDateCondition(
  condition: DataTableFilterCondition,
  now: Date,
  weekStartsOn: number | undefined
): DataTableFilterCondition {
  if (condition.operator === 'empty') return condition;
  const range = getDateConditionRange(condition, now, weekStartsOn);
  return {
    operator: 'between',
    value: [range[0]?.toISOString() ?? null, range[1]?.toISOString() ?? null],
    ...(condition.negate ? { negate: true } : null),
  };
}

/**
 * Prepares filters for a server: date conditions become inclusive `between` ranges of ISO timestamps,
 * so relative dates like `-7d` are evaluated now. Other conditions are returned unchanged.
 */
export function resolveFilters<T>(
  filters: DataTableFilters,
  { columns, now = new Date() }: { columns: DataTableColumn<T>[]; now?: Date }
): DataTableFilters {
  const configs = resolveColumnFilters(columns);
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, conditions]) => conditions?.length)
      .map(([key, conditions]) => {
        const filter = configs.get(key);
        if (filter?.type !== 'date') return [key, conditions];
        return [key, conditions.map((condition) => resolveDateCondition(condition, now, filter.weekStartsOn))];
      })
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
      for (const fragment of condition.value.split(/(?<!\\)[*?]/)) {
        const literal = fragment.replace(/\\(.)/g, '$1');
        if (literal.length > 1) terms.add(literal);
      }
    } else if (['contains', 'startsWith', 'endsWith', 'equals'].includes(condition.operator) && condition.value) {
      terms.add(condition.value);
    }
  }
  return [...terms];
}
