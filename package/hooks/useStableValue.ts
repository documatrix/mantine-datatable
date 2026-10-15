import { useInsertionEffect, useRef } from 'react';

export interface ReadonlyRef<T> {
  readonly current: T;
}

// Synced in an insertion effect like `useStableCallback`, so read `current` only in effects and
// event handlers, never during render.
export function useStableValue<T>(value: T): ReadonlyRef<T> {
  const ref = useRef<T>(value);
  useInsertionEffect(() => {
    ref.current = value;
  });
  return ref;
}
