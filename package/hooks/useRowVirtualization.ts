import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

type UseRowVirtualizationOptions = {
  enabled: boolean;
  count: number;
  scrollElement: HTMLElement | null;
  headerElement: HTMLElement | null;
  footerElement: HTMLElement | null;
  rowHeight: number | undefined;
  measureRows: boolean;
  overscan: number;
  getItemKey: ((index: number) => string | number) | undefined;
  virtualizerRef: React.RefObject<Virtualizer<HTMLElement, HTMLTableRowElement> | null> | undefined;
};

const DEFAULT_ROW_HEIGHT = 40;

export type RowVirtualizationInfo = {
  virtualItems: VirtualItem[];
  paddingTop: number;
  paddingBottom: number;
  // Rows must also carry a `data-index` attribute.
  measureRef: (element: HTMLTableRowElement | null) => void;
  expansionRowRef: (element: HTMLTableRowElement | null) => (() => void) | undefined;
};

// A row's size includes the trailing `tr`s it drags along (row expansion rows).
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
  scrollElement,
  headerElement,
  footerElement,
  rowHeight,
  measureRows,
  overscan,
  getItemKey,
  virtualizerRef,
}: UseRowVirtualizationOptions): RowVirtualizationInfo | null {
  // Height of the first rendered row, used as the estimate for all rows when no `rowHeight`
  // is given.
  const [firstRowHeight, setFirstRowHeight] = useState<number | null>(null);
  const firstRowMeasuredRef = useRef(false);
  const estimatedRowHeight = rowHeight ?? firstRowHeight ?? DEFAULT_ROW_HEIGHT;

  // The sticky header and footer cover the bottom of the scrolled-to range, as tbody starts below the header.
  const [stickyHeight, setStickyHeight] = useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || typeof ResizeObserver === 'undefined') return;

    const elements = [headerElement, footerElement].filter((element) => element !== null);
    const update = () =>
      setStickyHeight(elements.reduce((sum, element) => sum + element.getBoundingClientRect().height, 0));

    update();

    const observer = new ResizeObserver(update);

    for (const element of elements) observer.observe(element);

    return () => observer.disconnect();
  }, [enabled, headerElement, footerElement]);

  const virtualizer = useVirtualizer<HTMLElement, HTMLTableRowElement>({
    count,
    enabled,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimatedRowHeight,
    overscan,
    scrollPaddingEnd: stickyHeight,
    getItemKey,
    measureElement: measureRowWithTrailingSiblings,
    // Defer ResizeObserver-driven remeasurements to an animation frame; otherwise the
    // virtualizer may call flushSync from inside a React lifecycle (e.g. when rows are
    // measured right after a scrollToIndex()), which triggers a React warning.
    useAnimationFrameWithResizeObserver: true,
  });

  useEffect(() => {
    if (!virtualizerRef || !enabled) return;
    virtualizerRef.current = virtualizer;
    return () => {
      virtualizerRef.current = null;
    };
  }, [enabled, virtualizer, virtualizerRef]);

  // The estimate is baked into the virtualizer's measurement cache, so a changed estimate has
  // to reset it.
  useEffect(() => {
    if (enabled) virtualizer.measure();
  }, [enabled, estimatedRowHeight, virtualizer]);

  // Measuring can make the virtualizer flushSync, which React forbids (and warns about) inside ref callbacks.
  const measureRef = useCallback(
    (element: HTMLTableRowElement | null) => {
      if (measureRows) {
        queueMicrotask(() => virtualizer.measureElement(element));
        return;
      }
      if (!element || rowHeight !== undefined || firstRowMeasuredRef.current) return;
      firstRowMeasuredRef.current = true;
      setFirstRowHeight(measureRowWithTrailingSiblings(element));
    },
    [measureRows, rowHeight, virtualizer]
  );

  // The virtualizer only observes the rows themselves, so it never notices a row expansion row
  // changing height; observe it and remeasure its row on every change.
  const expansionRowRef = useCallback(
    (element: HTMLTableRowElement | null) => {
      if (!element || typeof ResizeObserver === 'undefined') return;
      let sibling = element.previousElementSibling;
      while (sibling && !sibling.classList.contains('mantine-datatable-row')) sibling = sibling.previousElementSibling;
      if (!(sibling instanceof HTMLTableRowElement)) return;
      const row = sibling;
      // Deferred like the virtualizer's own observer: `resizeItem` may flushSync.
      let frame = 0;
      const remeasure = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (!row.isConnected) return;
          virtualizer.resizeItem(virtualizer.indexFromElement(row), measureRowWithTrailingSiblings(row));
        });
      };
      const observer = new ResizeObserver(remeasure);
      observer.observe(element);
      return () => {
        observer.disconnect();
        remeasure();
      };
    },
    [virtualizer]
  );

  // React Compiler skips this hook (useVirtualizer is flagged as incompatible), hence the explicit memo.
  const virtualItems = enabled ? virtualizer.getVirtualItems() : null;
  const totalSize = enabled ? virtualizer.getTotalSize() : 0;

  return useMemo<RowVirtualizationInfo | null>(() => {
    if (!virtualItems) return null;
    return {
      virtualItems,
      paddingTop: virtualItems.length > 0 ? virtualItems[0].start : 0,
      paddingBottom: virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0,
      measureRef,
      expansionRowRef,
    };
  }, [virtualItems, totalSize, measureRef, expansionRowRef]);
}
