import { useCallbackRef } from '@mantine/hooks';

// Stable identity for an optional event handler; stays `undefined` when the handler is, so presence
// checks (cursor styles, disabled states) keep working. Event handlers only, never render-time functions.
export function useOptionalCallbackRef<F extends (...args: never[]) => unknown>(handler: F | undefined) {
  const stableHandler = useCallbackRef(handler);
  return handler ? stableHandler : undefined;
}
