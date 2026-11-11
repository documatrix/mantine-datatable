export type DateOffsetUnit = 'y' | 'mo' | 'w' | 'd' | 'h' | 'min';
export type DatePrecision = 'year' | 'month' | 'day' | 'minute' | 'second' | 'instant';

export type DateTokenInfo =
  | { kind: 'now' }
  | { kind: 'relative'; amount: number; unit: DateOffsetUnit }
  | { kind: 'absolute'; precision: DatePrecision; date: Date };

const ISO_DATE = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?)?)?$/i;
const DOTTED_DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/i;
const DOTTED_MONTH = /^(\d{1,2})\.(\d{4})$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
const RELATIVE = /^([+-]?\d+)\s*(y|mo|w|d|h|min|m)$/i;
const KEYWORDS: Record<string, string> = { now: 'now', today: '0d', yesterday: '-1d', tomorrow: '+1d' };

const pad = (n: number, length = 2) => String(n).padStart(length, '0');

/**
 * Formats a local date as a `YYYY-MM-DD` day token.
 */
export const toDayToken = (date: Date) =>
  `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function buildAbsolute(
  year: number,
  month?: number,
  day?: number,
  hours?: number,
  minutes?: number,
  seconds?: number
): string | null {
  if (month === undefined) return pad(year, 4);
  if (month < 1 || month > 12) return null;
  if (day === undefined) return `${pad(year, 4)}-${pad(month)}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  const date = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
  if (hours === undefined || minutes === undefined) return date;
  if (hours > 23 || minutes > 59 || (seconds !== undefined && seconds > 59)) return null;
  const time = `${pad(hours)}:${pad(minutes)}${seconds === undefined ? '' : `:${pad(seconds)}`}`;
  return `${date}T${time}`;
}

const num = (value: string | undefined) => (value === undefined ? undefined : Number(value));

/**
 * Normalizes user input to a canonical date token, or returns `null` when it is not a date.
 */
export function normalizeDateToken(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (KEYWORDS[text]) return KEYWORDS[text];

  const relative = RELATIVE.exec(text);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2] === 'm' ? 'min' : relative[2];
    return `${amount > 0 ? '+' : ''}${amount}${unit}`;
  }

  if (INSTANT.test(text)) {
    const instant = new Date(input.trim());
    return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
  }

  const iso = ISO_DATE.exec(text);
  if (iso) return buildAbsolute(Number(iso[1]), num(iso[2]), num(iso[3]), num(iso[4]), num(iso[5]), num(iso[6]));

  const dotted = DOTTED_DATE.exec(text);
  if (dotted) {
    return buildAbsolute(
      Number(dotted[3]),
      Number(dotted[2]),
      Number(dotted[1]),
      num(dotted[4]),
      num(dotted[5]),
      num(dotted[6])
    );
  }

  const dottedMonth = DOTTED_MONTH.exec(text);
  if (dottedMonth) return buildAbsolute(Number(dottedMonth[2]), Number(dottedMonth[1]));

  return null;
}

export function getDateTokenInfo(token: string): DateTokenInfo | null {
  const normalized = normalizeDateToken(token);
  if (!normalized) return null;
  if (normalized === 'now') return { kind: 'now' };

  const relative = RELATIVE.exec(normalized);
  if (relative) return { kind: 'relative', amount: Number(relative[1]), unit: relative[2] as DateOffsetUnit };

  if (INSTANT.test(normalized)) return { kind: 'absolute', precision: 'instant', date: new Date(normalized) };

  const iso = ISO_DATE.exec(normalized)!;
  const [, y, mo, d, h, mi, s] = iso;
  const precision: DatePrecision = s ? 'second' : mi ? 'minute' : d ? 'day' : mo ? 'month' : 'year';
  const date = new Date(Number(y), mo ? Number(mo) - 1 : 0, d ? Number(d) : 1, num(h) ?? 0, num(mi) ?? 0, num(s) ?? 0);
  // Years below 100 would otherwise map to 19xx
  date.setFullYear(Number(y));
  return { kind: 'absolute', precision, date };
}

export type DatePeriod = { start: Date; end: Date };

function shift(date: Date, precision: DatePrecision | DateOffsetUnit, amount: number) {
  const d = new Date(date);
  switch (precision) {
    case 'year':
    case 'y':
      d.setFullYear(d.getFullYear() + amount);
      break;
    case 'month':
    case 'mo':
      d.setMonth(d.getMonth() + amount);
      break;
    case 'w':
      d.setDate(d.getDate() + amount * 7);
      break;
    case 'day':
    case 'd':
      d.setDate(d.getDate() + amount);
      break;
    case 'h':
      d.setHours(d.getHours() + amount);
      break;
    case 'minute':
    case 'min':
      d.setMinutes(d.getMinutes() + amount);
      break;
    case 'second':
      d.setSeconds(d.getSeconds() + amount);
      break;
    case 'instant':
      d.setMilliseconds(d.getMilliseconds() + amount);
      break;
  }
  return d;
}

function startOf(now: Date, unit: DateOffsetUnit, weekStartsOn: number) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (unit) {
    case 'y':
      return new Date(y, 0, 1);
    case 'mo':
      return new Date(y, m, 1);
    case 'w':
      return new Date(y, m, d - ((now.getDay() - weekStartsOn + 7) % 7));
    case 'd':
      return new Date(y, m, d);
    case 'h':
      return new Date(y, m, d, now.getHours());
    case 'min':
      return new Date(y, m, d, now.getHours(), now.getMinutes());
  }
}

/**
 * Resolves a date token to the period it covers, in local time. `end` is exclusive.
 */
export function resolveDatePeriod(token: string, now: Date, weekStartsOn = 1): DatePeriod | null {
  const info = getDateTokenInfo(token);
  if (!info) return null;
  if (info.kind === 'now') return { start: now, end: new Date(now.getTime() + 1) };
  if (info.kind === 'relative') {
    const start = shift(startOf(now, info.unit, weekStartsOn), info.unit, info.amount);
    return { start, end: shift(start, info.unit, 1) };
  }
  return { start: info.date, end: shift(info.date, info.precision, 1) };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converts a record value to a `Date`. Date-only ISO strings are read as local dates so they don't shift
 * to the previous day west of UTC.
 */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value !== 'string' || value === '') return null;
  if (DATE_ONLY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
