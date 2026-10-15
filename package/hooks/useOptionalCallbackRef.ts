import { useStableCallback } from './useStableCallback';

// Stays `undefined` when the handler is, so presence checks (cursor styles, disabled states) keep
// working. Event handlers only, never render-time functions.
export function useOptionalCallbackRef<A extends unknown[], R>(handler: ((...args: A) => R) | undefined) {
  const stableHandler = useStableCallback(handler);
  return handler ? stableHandler : undefined;
}
