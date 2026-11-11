import type {
  DataTableFilterCondition,
  DataTableFilterOption,
  DataTableFilterRange,
  DataTableFilterScalar,
  DataTableFilterTexts,
} from '../types/DataTableFilter';
import type { DataTableResolvedFilter } from './config';
import { type DateOffsetUnit, type DatePrecision, getDateTokenInfo } from './dates';
import { formatDurationCompact } from './syntax';

export type DataTableFilterFormatContext = {
  texts: DataTableFilterTexts;
  locale?: string;
  options?: DataTableFilterOption[];
};

const RELATIVE_UNITS: Record<DateOffsetUnit, Intl.RelativeTimeFormatUnit> = {
  y: 'year',
  mo: 'month',
  w: 'week',
  d: 'day',
  h: 'hour',
  min: 'minute',
};

const DATE_FORMATS: Record<DatePrecision, Intl.DateTimeFormatOptions> = {
  year: { year: 'numeric' },
  month: { year: 'numeric', month: 'short' },
  day: { year: 'numeric', month: 'short', day: 'numeric' },
  minute: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  second: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' },
  instant: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' },
};

export function formatDateToken(token: string, { texts, locale }: DataTableFilterFormatContext) {
  const info = getDateTokenInfo(token);
  if (!info) return token;
  if (info.kind === 'now') return texts.now;
  if (info.kind === 'relative') {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(info.amount, RELATIVE_UNITS[info.unit]);
  }
  return new Intl.DateTimeFormat(locale, DATE_FORMATS[info.precision]).format(info.date);
}

export function formatFilterValue(
  value: DataTableFilterScalar,
  filter: DataTableResolvedFilter,
  context: DataTableFilterFormatContext
): string {
  switch (filter.type) {
    case 'number':
      return typeof value === 'number'
        ? new Intl.NumberFormat(context.locale, filter.formatOptions).format(value)
        : String(value);
    case 'duration':
      return typeof value === 'number' ? formatDurationCompact(value, filter.unit, ' ') : String(value);
    case 'date':
      return formatDateToken(String(value), context);
    case 'boolean':
      return value ? context.texts.yes : context.texts.no;
    case 'select':
      return context.options?.find((option) => option.value === value)?.label ?? String(value);
    default:
      return String(value);
  }
}

const quote = (text: string) => `“${text}”`;

/**
 * Formats a condition for pills and chips, e.g. `contains “foo”`, `≥ 5`, `last month`, `last 7 days`.
 */
export function formatFilterCondition(
  condition: DataTableFilterCondition,
  filter: DataTableResolvedFilter,
  context: DataTableFilterFormatContext
): string {
  const { texts } = context;
  const ops = texts.operators;
  const { operator, value, negate } = condition;

  if (filter.type === 'custom' && filter.format) return filter.format(condition);
  if (operator === 'empty') return negate ? texts.notEmpty : texts.empty;

  const isDate = filter.type === 'date';
  const formatScalar = (scalar: DataTableFilterScalar) => formatFilterValue(scalar, filter, context);

  if (operator === 'between') {
    const [from, to] = (Array.isArray(value) ? value : [null, null]) as DataTableFilterRange;
    let text: string;
    const lastDays = isDate && to !== null && /^[+-]?0d$/.test(String(to)) && /^-\d+d$/.exec(String(from));
    if (lastDays) {
      text = texts.lastDays(-Number.parseInt(String(from), 10) + 1);
    } else if (from !== null && to !== null) {
      text = ops.between(formatScalar(from), formatScalar(to));
      return negate ? ops.notBetween(formatScalar(from), formatScalar(to)) : text;
    } else if (from !== null) {
      text = (isDate ? texts.dateOperators.gte : ops.gte)(formatScalar(from));
    } else if (to !== null) {
      text = (isDate ? texts.dateOperators.lte : ops.lte)(formatScalar(to));
    } else {
      text = '';
    }
    return negate ? ops.not(text) : text;
  }

  const scalar = value as DataTableFilterScalar;
  const formatted = formatScalar(scalar);
  const literal = quote(String(scalar));

  switch (operator) {
    case 'contains':
      return negate ? ops.notContains(literal) : ops.contains(literal);
    case 'startsWith':
      return negate ? ops.notStartsWith(literal) : ops.startsWith(literal);
    case 'endsWith':
      return negate ? ops.notEndsWith(literal) : ops.endsWith(literal);
    case 'like':
      return negate ? ops.notLike(literal) : ops.like(literal);
    case 'equals':
      if (isDate) return negate ? texts.dateOperators.notEquals(formatted) : texts.dateOperators.equals(formatted);
      if (filter.type === 'boolean') return negate ? ops.notEquals(formatted) : formatted;
      if (filter.type === 'select') {
        const label = context.options?.find((option) => option.value === scalar)?.label;
        if (label !== undefined) return negate ? ops.notEquals(label) : label;
        return negate ? ops.notEquals(literal) : ops.equals(literal);
      }
      return negate
        ? ops.notEquals(filter.type === 'text' ? literal : formatted)
        : ops.equals(filter.type === 'text' ? literal : formatted);
    default: {
      const format = (isDate ? texts.dateOperators[operator] : ops[operator]) as
        | ((value: string) => string)
        | undefined;
      const text = format ? format(formatted) : `${operator} ${formatted}`;
      return negate ? ops.not(text) : text;
    }
  }
}
