import type {
  DataTableDurationUnit,
  DataTableFilterCondition,
  DataTableFilterOperator,
  DataTableFilterOption,
  DataTableFilterRange,
  DataTableFilterScalar,
  DataTableFilterTexts,
} from '../types/DataTableFilter';
import type { DataTableResolvedFilter } from './config';
import { normalizeDateToken } from './dates';

export type DataTableFilterParseContext = {
  texts: DataTableFilterTexts;
  /**
   * Options known for select filters (static and loaded), used to match typed labels.
   */
  options?: DataTableFilterOption[];
};

export type DataTableFilterTokenResult = { condition: DataTableFilterCondition } | { error: string };

export type DataTableFilterParseResult = {
  conditions: DataTableFilterCondition[];
  error?: string;
};

export type Part = { literal: string } | { wildcard: '*' | '?' };

const OPERATOR_SYMBOLS: Record<DataTableFilterOperator, string> = {
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  equals: '=',
  like: '* ?',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  between: '..',
  empty: '=',
};

const PREFIXES: [prefix: string, operator: DataTableFilterOperator, flipNegate?: boolean][] = [
  ['>=', 'gte'],
  ['<=', 'lte'],
  ['≥', 'gte'],
  ['≤', 'lte'],
  ['≠', 'equals', true],
  ['>', 'gt'],
  ['<', 'lt'],
  ['=', 'equals'],
];

const DURATION_UNITS: Record<string, number> = {
  ms: 1,
  s: 1e3,
  sec: 1e3,
  m: 6e4,
  min: 6e4,
  h: 36e5,
  d: 864e5,
  w: 6048e5,
};

export const foldText = (text: string, caseSensitive?: boolean) =>
  caseSensitive
    ? text
    : text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

/**
 * Splits input at commas outside quotes. A backslash escapes the next character.
 */
export function splitFilterInput(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && i + 1 < input.length) {
      current += ch + input[++i];
      continue;
    }
    if (ch === '"') quoted = !quoted;
    if (ch === ',' && !quoted) {
      tokens.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  tokens.push(current);
  return tokens.map((token) => token.trim()).filter(Boolean);
}

export function isInsideQuotes(input: string) {
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\\') i++;
    else if (input[i] === '"') quoted = !quoted;
  }
  return quoted;
}

/**
 * Whether a comma typed after `input` is part of the value (inside quotes or escaped by a trailing backslash)
 * rather than a separator.
 */
export function isLiteralCommaPosition(input: string) {
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\\') {
      if (i === input.length - 1) return true;
      i++;
    } else if (input[i] === '"') quoted = !quoted;
  }
  return quoted;
}

function lex(input: string): Part[] | null {
  const parts: Part[] = [];
  let buffer = '';
  let quoted = false;
  const flush = () => {
    if (buffer) parts.push({ literal: buffer });
    buffer = '';
  };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && i + 1 < input.length) {
      buffer += input[++i];
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (!quoted && (ch === '*' || ch === '?')) {
      flush();
      parts.push({ wildcard: ch });
    } else {
      buffer += ch;
    }
  }
  if (quoted) return null;
  flush();
  return parts;
}

export const isWildcard = (part: Part): part is { wildcard: '*' | '?' } => 'wildcard' in part;

function partsToLiteral(parts: Part[]) {
  return parts.map((part) => (isWildcard(part) ? part.wildcard : part.literal)).join('');
}

export function escapeGlob(text: string) {
  return text.replace(/[\\*?]/g, '\\$&');
}

function partsToGlob(parts: Part[]) {
  return parts.map((part) => (isWildcard(part) ? part.wildcard : escapeGlob(part.literal))).join('');
}

/**
 * Splits a `like` glob into literal text and wildcards, resolving backslash escapes.
 */
export function globToParts(glob: string): Part[] {
  const parts: Part[] = [];
  let buffer = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '\\' && i + 1 < glob.length) {
      buffer += glob[++i];
    } else if (ch === '*' || ch === '?') {
      if (buffer) parts.push({ literal: buffer });
      buffer = '';
      parts.push({ wildcard: ch });
    } else {
      buffer += ch;
    }
  }
  if (buffer) parts.push({ literal: buffer });
  return parts;
}

function findRangeSeparator(input: string) {
  let quoted = false;
  for (let i = 0; i < input.length - 1; i++) {
    const ch = input[i];
    if (ch === '\\') i++;
    else if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === '.' && input[i + 1] === '.') return i;
  }
  return -1;
}

export function parseFilterNumber(text: string): number | null {
  const cleaned = text.replace(/[_'\s]/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(cleaned)) return null;
  return Number(cleaned);
}

export function parseFilterDuration(text: string, unit: DataTableDurationUnit = 'ms'): number | null {
  const signed = text.replace(/\s+/g, '').toLowerCase();
  const bare = parseFilterNumber(signed);
  if (bare !== null) return bare;
  const sign = signed.startsWith('-') ? -1 : 1;
  const compact = signed.replace(/^[+-]/, '');
  const re = /(\d+(?:\.\d+)?)(ms|sec|min|s|m|h|d|w)/y;
  let total = 0;
  let consumed = 0;
  for (let match = re.exec(compact); match; match = re.exec(compact)) {
    total += Number(match[1]) * DURATION_UNITS[match[2]];
    consumed = re.lastIndex;
  }
  if (consumed === 0 || consumed !== compact.length) return null;
  return (sign * total) / DURATION_UNITS[unit];
}

export function formatDurationCompact(value: number, unit: DataTableDurationUnit = 'ms', separator = '') {
  let ms = Math.round(Math.abs(value) * DURATION_UNITS[unit]);
  if (ms === 0) return '0ms';
  const parts: string[] = [];
  for (const [suffix, size] of [
    ['d', DURATION_UNITS.d],
    ['h', DURATION_UNITS.h],
    ['m', DURATION_UNITS.m],
    ['s', DURATION_UNITS.s],
    ['ms', 1],
  ] as const) {
    const amount = Math.floor(ms / size);
    if (amount) parts.push(`${amount}${suffix}`);
    ms -= amount * size;
  }
  return (value < 0 ? '-' : '') + parts.join(separator);
}

function findOption(options: DataTableFilterOption[] | undefined, text: string) {
  if (!options) return undefined;
  const folded = foldText(text);
  return (
    options.find((option) => option.label !== undefined && foldText(option.label) === folded) ??
    options.find((option) => foldText(String(option.value)) === folded)
  );
}

type TokenState = {
  rest: string;
  operator: DataTableFilterOperator | undefined;
  prefix: string;
  negate: boolean;
};

/**
 * Parses a single filter token (no commas) into a condition.
 */
export function parseFilterToken(
  raw: string,
  filter: DataTableResolvedFilter,
  { texts, options }: DataTableFilterParseContext
): DataTableFilterTokenResult {
  const errors = texts.errors;
  const state: TokenState = { rest: raw.trim(), operator: undefined, prefix: '', negate: false };

  if (state.rest.startsWith('!')) {
    state.negate = true;
    state.rest = state.rest.slice(1).trimStart();
  }
  for (const [prefix, operator, flipNegate] of PREFIXES) {
    if (state.rest.startsWith(prefix)) {
      state.operator = operator;
      state.prefix = prefix;
      if (flipNegate) state.negate = !state.negate;
      state.rest = state.rest.slice(prefix.length).trimStart();
      break;
    }
  }

  const check = (condition: DataTableFilterCondition): DataTableFilterTokenResult => {
    if (!filter.operators.includes(condition.operator)) {
      return { error: errors.unsupportedOperator(OPERATOR_SYMBOLS[condition.operator]) };
    }
    return { condition: state.negate ? { ...condition, negate: true } : condition };
  };

  if (state.operator === 'equals' && state.rest === '') return check({ operator: 'empty' });
  if (state.rest === '') return { error: errors.missingValue };

  const { type } = filter;
  if (type === 'number' || type === 'duration' || type === 'date') {
    const separator = findRangeSeparator(state.rest);
    if (separator >= 0) {
      if (state.operator) return { error: errors.unsupportedOperator(state.prefix) };
      const bounds = [state.rest.slice(0, separator).trim(), state.rest.slice(separator + 2).trim()];
      if (!bounds[0] && !bounds[1]) return { error: errors.emptyRange };
      const range: DataTableFilterRange = [null, null];
      for (const i of [0, 1] as const) {
        if (!bounds[i]) continue;
        const parsed = parseRangeScalar(bounds[i], filter, texts);
        if ('error' in parsed) return parsed;
        range[i] = parsed.value;
      }
      return check({ operator: 'between', value: range });
    }
    const parsed = parseRangeScalar(state.rest, filter, texts);
    if ('error' in parsed) return parsed;
    return check({ operator: state.operator ?? filter.defaultOperator, value: parsed.value });
  }

  if (type === 'boolean') {
    const parts = lex(state.rest);
    if (!parts) return { error: errors.unterminatedQuote };
    if (state.operator && state.operator !== 'equals') return { error: errors.unsupportedOperator(state.prefix) };
    const text = foldText(partsToLiteral(parts));
    if (['true', 'yes', 'y', '1', 'on', foldText(texts.yes)].includes(text)) {
      return check({ operator: 'equals', value: true });
    }
    if (['false', 'no', 'n', '0', 'off', foldText(texts.no)].includes(text)) {
      return check({ operator: 'equals', value: false });
    }
    return { error: errors.invalidBoolean };
  }

  const parts = lex(state.rest);
  if (!parts) return { error: errors.unterminatedQuote };
  const hasWildcard = parts.some(isWildcard);

  if (type === 'select' && !hasWildcard && (!state.operator || state.operator === 'equals')) {
    const literal = partsToLiteral(parts);
    const option = findOption(options, literal);
    if (option) {
      return option.value === null ? check({ operator: 'empty' }) : check({ operator: 'equals', value: option.value });
    }
    if (filter.allowCustomValues === false) return { error: errors.unknownOption };
    return check({ operator: 'equals', value: literal });
  }
  if (type === 'select' && filter.allowCustomValues === false) return { error: errors.unknownOption };

  if (state.operator && state.operator !== 'equals') {
    return check({ operator: state.operator, value: partsToLiteral(parts) });
  }
  if (hasWildcard) return check(classifyPattern(parts));
  const operator = state.operator ?? filter.defaultOperator;
  return check({ operator, value: operator === 'like' ? partsToGlob(parts) : partsToLiteral(parts) });
}

function classifyPattern(parts: Part[]): DataTableFilterCondition {
  const leading = isWildcard(parts[0]) && parts[0].wildcard === '*';
  const last = parts[parts.length - 1];
  const trailing = parts.length > 1 && isWildcard(last) && last.wildcard === '*';
  const middle = parts.slice(leading ? 1 : 0, trailing ? -1 : undefined);
  if ((leading || trailing) && middle.length === 1 && !isWildcard(middle[0])) {
    const value = middle[0].literal;
    if (leading && trailing) return { operator: 'contains', value };
    return { operator: leading ? 'endsWith' : 'startsWith', value };
  }
  return { operator: 'like', value: partsToGlob(parts) };
}

function parseRangeScalar(
  text: string,
  filter: DataTableResolvedFilter,
  texts: DataTableFilterTexts
): { value: DataTableFilterScalar } | { error: string } {
  const parts = lex(text);
  if (!parts) return { error: texts.errors.unterminatedQuote };
  const literal = parts.some(isWildcard) ? null : partsToLiteral(parts);
  if (filter.type === 'date') {
    const token = literal === null ? null : normalizeDateToken(literal);
    return token ? { value: token } : { error: texts.errors.invalidDate };
  }
  if (filter.type === 'duration') {
    const value = literal === null ? null : parseFilterDuration(literal, filter.unit);
    return value === null ? { error: texts.errors.invalidDuration } : { value };
  }
  const value = literal === null ? null : parseFilterNumber(literal);
  return value === null ? { error: texts.errors.invalidNumber } : { value };
}

/**
 * Returns the text to search options for: the literal text of the last token, without negation,
 * operator prefix, quotes and wildcards. `plain` is false when the input has several tokens or the token has
 * a negation or operator, since picking an option then wouldn't apply what was typed.
 */
export function getFilterSearchTerm(input: string): { term: string; plain: boolean } {
  const tokens = splitFilterInput(input);
  let rest = tokens[tokens.length - 1] ?? '';
  // Picking an option would drop the other typed tokens.
  let plain = tokens.length <= 1;
  if (rest.startsWith('!')) {
    plain = false;
    rest = rest.slice(1).trimStart();
  }
  const prefix = PREFIXES.find(([candidate]) => rest.startsWith(candidate));
  if (prefix) {
    if (prefix[0] !== '=') plain = false;
    rest = rest.slice(prefix[0].length).trimStart();
  }
  const parts = lex(rest) ?? lex(`${rest}"`) ?? [];
  return {
    term: parts
      .filter((part) => !isWildcard(part))
      .map((part) => (part as { literal: string }).literal)
      .join(''),
    plain,
  };
}

/**
 * Parses comma-separated input into conditions. Stops at the first invalid token.
 */
export function parseFilterInput(
  input: string,
  filter: DataTableResolvedFilter,
  context: DataTableFilterParseContext
): DataTableFilterParseResult {
  if (isInsideQuotes(input)) return { conditions: [], error: context.texts.errors.unterminatedQuote };
  const tokens = splitFilterInput(input);
  if (!tokens.length) return { conditions: [], error: context.texts.errors.missingValue };
  const conditions: DataTableFilterCondition[] = [];
  for (const token of tokens) {
    const result = parseFilterToken(token, filter, context);
    if ('error' in result) return { conditions, error: result.error };
    conditions.push(result.condition);
  }
  return { conditions };
}

const NEEDS_QUOTES = /[*?",\\]|^[\s!=<>≥≤≠]|\s$/;

function quoteIfNeeded(text: string) {
  return text === '' || NEEDS_QUOTES.test(text) ? `"${text.replace(/[\\"]/g, '\\$&')}"` : text;
}

function scalarToText(
  value: DataTableFilterScalar,
  filter: DataTableResolvedFilter,
  options?: DataTableFilterOption[]
) {
  if (filter.type === 'duration' && typeof value === 'number') return formatDurationCompact(value, filter.unit);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  const label = filter.type === 'select' ? options?.find((o) => o.value === value)?.label : undefined;
  if (label !== undefined) return quoteIfNeeded(label);
  if (typeof value === 'number' || filter.type === 'date') return String(value);
  return quoteIfNeeded(String(value));
}

/**
 * Converts a condition back to text that parses to the same condition, for editing a pill.
 */
export function conditionToText(
  condition: DataTableFilterCondition,
  filter: DataTableResolvedFilter,
  options?: DataTableFilterOption[]
): string {
  const negation = condition.negate ? '!' : '';
  const { operator, value } = condition;
  if (operator === 'empty') return condition.negate ? '!=' : '=';
  if (operator === 'between') {
    const [from, to] = (value ?? [null, null]) as DataTableFilterRange;
    const text = (bound: DataTableFilterScalar | null) => (bound === null ? '' : scalarToText(bound, filter, options));
    return `${negation}${text(from)}..${text(to)}`;
  }
  const scalar = value as DataTableFilterScalar;
  const literal = quoteIfNeeded(String(scalar));
  const isDefault = operator === filter.defaultOperator;
  switch (operator) {
    case 'contains':
      return negation + (isDefault ? literal : `*${literal}*`);
    case 'startsWith':
      return `${negation}${literal}*`;
    case 'endsWith':
      return `${negation}*${literal}`;
    case 'like':
      return (
        negation +
        globToParts(String(scalar))
          .map((part) => (isWildcard(part) ? part.wildcard : quoteIfNeeded(part.literal)))
          .join('')
      );
    case 'equals':
      return negation + (isDefault || filter.type === 'boolean' ? '' : '=') + scalarToText(scalar, filter, options);
    default:
      return negation + OPERATOR_SYMBOLS[operator] + scalarToText(scalar, filter, options);
  }
}
