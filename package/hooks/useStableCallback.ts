import { useCallback, useInsertionEffect, useRef } from 'react';

// Synced in an insertion effect, which runs before any layout effect or ref callback (children's
// included), so nothing in the commit sees the previous render's closure.
export function useStableCallback<A extends unknown[], R>(handler: ((...args: A) => R) | undefined) {
  const handlerRef = useRef(handler);
  useInsertionEffect(() => {
    handlerRef.current = handler;
  });
  return useCallback((...args: A) => handlerRef.current?.(...args) as R, []);
}
