import type { DataTableFilterCondition, DataTableFilterOperator, DataTableFilters } from '../types/DataTableFilter';

const OPERATORS: Record<DataTableFilterOperator, true> = {
  contains: true,
  startsWith: true,
  endsWith: true,
  equals: true,
  like: true,
  gt: true,
  gte: true,
  lt: true,
  lte: true,
  between: true,
  empty: true,
};

const isScalar = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

function isFilterCondition(condition: unknown): condition is DataTableFilterCondition {
  if (typeof condition !== 'object' || condition === null) return false;
  const { operator, value } = condition as { operator?: unknown; value?: unknown };
  if (typeof operator !== 'string' || !Object.hasOwn(OPERATORS, operator)) return false;
  if (operator === 'empty') return true;
  if (Array.isArray(value)) return value.length === 2 && value.every((bound) => bound === null || isScalar(bound));
  return operator !== 'between' && (value === undefined || isScalar(value));
}

/**
 * Validates filters from an untrusted source such as storage, a URL or a request body. Conditions with an
 * unknown operator or a malformed value are dropped; returns `undefined` when the input isn't a filters object.
 */
export function sanitizeFilters(value: unknown): DataTableFilters | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  // `Object.fromEntries` defines own properties, so a `__proto__` key can't replace the prototype.
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, conditions]) => [key, Array.isArray(conditions) ? conditions.filter(isFilterCondition) : []] as const)
      .filter(([, conditions]) => conditions.length)
  );
}
