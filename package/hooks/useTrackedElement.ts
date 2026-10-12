import { useMergedRef } from '@mantine/hooks';
import { type RefObject, useState } from 'react';

// Element in state (not a ref) so effects can depend on it mounting or unmounting.
export function useTrackedElement<E extends HTMLElement>(objectRef: RefObject<E | null>) {
  const [element, setElement] = useState<E | null>(null);
  const ref = useMergedRef(objectRef, setElement);
  return [element, ref] as const;
}
