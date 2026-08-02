import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { useEffect, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

type UseRowVirtualizationOptions = {
  enabled: boolean;
  count: number;
  scrollViewportRef: React.RefObject<HTMLElement | null>;
  rowHeight: number;
  overscan: number;
  getItemKey: ((index: number) => string | number) | undefined;
  virtualizerRef: React.RefObject<Virtualizer<HTMLElement, HTMLTableRowElement> | null> | undefined;
};

export type RowVirtualizationInfo = {
  virtualItems: VirtualItem[];
  /**
   * Height of the spacer row rendered before the first virtual row.
   */
  paddingTop: number;
  /**
   * Height of the spacer row rendered after the last virtual row.
   */
  paddingBottom: number;
  /**
   * Ref callback measuring rendered rows; rows must also carry a `data-index` attribute.
   */
  measureRef: (element: HTMLTableRowElement | null) => void;
};

/**
 * Measures a row together with the extra rows it may drag along (such as row expansion rows),
 * i.e. all the sibling `tr` elements that follow it up to the next data row or spacer row.
 */
function measureRowWithTrailingSiblings(element: HTMLTableRowElement) {
  let height = element.getBoundingClientRect().height;
  let sibling = element.nextElementSibling;
  while (
    sibling &&
    !sibling.classList.contains('mantine-datatable-row') &&
    !sibling.classList.contains('mantine-datatable-spacer-row') &&
    !sibling.classList.contains('mantine-datatable-empty-row')
  ) {
    height += sibling.getBoundingClientRect().height;
    sibling = sibling.nextElementSibling;
  }
  return height;
}

export function useRowVirtualization({
  enabled,
  count,
  scrollViewportRef,
  rowHeight,
  overscan,
  getItemKey,
  virtualizerRef,
}: UseRowVirtualizationOptions): RowVirtualizationInfo | null {
  // Track the scroll element in state so that a re-render is guaranteed once it's available:
  // the virtualizer only attaches its scroll/resize observers when getScrollElement() returns
  // a non-null element during render.
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    setScrollElement(scrollViewportRef.current);
  }, [scrollViewportRef]);

  const virtualizer = useVirtualizer<HTMLElement, HTMLTableRowElement>({
    count,
    enabled,
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan,
    // Key the measurement cache by record id, so measured heights (e.g. of expanded rows)
    // follow their records when the data is re-sorted or mutated.
    getItemKey,
    measureElement: measureRowWithTrailingSiblings,
    // Defer ResizeObserver-driven remeasurements to an animation frame; otherwise the
    // virtualizer may call flushSync from inside a React lifecycle (e.g. when rows are
    // measured right after a scrollToIndex()), which triggers a React warning.
    useAnimationFrameWithResizeObserver: true,
  });

  useEffect(() => {
    if (virtualizerRef) {
      virtualizerRef.current = enabled ? virtualizer : null;
    }
  }, [enabled, virtualizer, virtualizerRef]);

  if (!enabled) return null;

  const virtualItems = virtualizer.getVirtualItems();

  return {
    virtualItems,
    paddingTop: virtualItems.length > 0 ? virtualItems[0].start : 0,
    paddingBottom: virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0,
    measureRef: virtualizer.measureElement,
  };
}
