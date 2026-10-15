import { useState } from 'react';

function shallowEqual(a: unknown, b: unknown) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

// Keeps the previous value while the new one is shallowly equal, so consumers passing inline
// objects don't break downstream memoization (e.g. every row).
export function useShallowStable<T>(value: T): T {
  const [stable, setStable] = useState(value);
  if (shallowEqual(stable, value)) return stable;
  setStable(value);
  return value;
}
