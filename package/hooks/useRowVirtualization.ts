import {
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { useCallback, useEffect, useState } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

type UseRowVirtualizationOptions = {
  enabled: boolean;
  count: number;
  scrollViewportRef: React.RefObject<HTMLElement | null>;
  headerRef: React.RefObject<HTMLElement | null>;
  footerRef: React.RefObject<HTMLElement | null>;
  hasHeader: boolean;
  hasFooter: boolean;
  rowHeight: number;
  overscan: number;
  getItemKey: ((index: number) => string | number) | undefined;
  virtualizerRef:
    | React.RefObject<Virtualizer<HTMLElement, HTMLTableRowElement> | null>
    | undefined;
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
  /**
   * Ref callback for row expansion rows; remeasures the row they belong to when they change height.
   */
  expansionRowRef: (
    element: HTMLTableRowElement | null,
  ) => (() => void) | undefined;
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
    !sibling.classList.contains("mantine-datatable-row") &&
    !sibling.classList.contains("mantine-datatable-spacer-row") &&
    !sibling.classList.contains("mantine-datatable-empty-row")
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
  headerRef,
  footerRef,
  hasHeader,
  hasFooter,
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

  // The sticky header and footer cover the bottom of the scrolled-to range, as tbody starts below the header.
  const [stickyHeight, setStickyHeight] = useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || typeof ResizeObserver === "undefined") return;

    const elements = [headerRef.current, footerRef.current].filter(
      (element) => element !== null,
    );
    const update = () =>
      setStickyHeight(
        elements.reduce(
          (sum, element) => sum + element.getBoundingClientRect().height,
          0,
        ),
      );

    update();

    const observer = new ResizeObserver(update);

    for (const element of elements) observer.observe(element);

    return () => observer.disconnect();
  }, [enabled, headerRef, footerRef, hasHeader, hasFooter]);

  const virtualizer = useVirtualizer<HTMLElement, HTMLTableRowElement>({
    count,
    enabled,
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan,
    scrollPaddingEnd: stickyHeight,
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

  // Measuring can make the virtualizer flushSync, which React forbids (and warns about) inside ref callbacks.
  const measureRef = useCallback(
    (element: HTMLTableRowElement | null) =>
      queueMicrotask(() => virtualizer.measureElement(element)),
    [virtualizer],
  );

  // The virtualizer only observes the rows themselves, so it never notices a row expansion row
  // changing height; observe it and remeasure its row on every change.
  const expansionRowRef = useCallback(
    (element: HTMLTableRowElement | null) => {
      if (!element || typeof ResizeObserver === "undefined") return;
      let sibling = element.previousElementSibling;
      while (sibling && !sibling.classList.contains("mantine-datatable-row"))
        sibling = sibling.previousElementSibling;
      if (!(sibling instanceof HTMLTableRowElement)) return;
      const row = sibling;
      const remeasure = () => {
        if (!row.isConnected) return;
        virtualizer.resizeItem(
          virtualizer.indexFromElement(row),
          measureRowWithTrailingSiblings(row),
        );
      };
      const observer = new ResizeObserver(remeasure);
      observer.observe(element);
      return () => {
        observer.disconnect();
        requestAnimationFrame(remeasure);
      };
    },
    [virtualizer],
  );

  if (!enabled) return null;

  const virtualItems = virtualizer.getVirtualItems();

  return {
    virtualItems,
    paddingTop: virtualItems.length > 0 ? virtualItems[0].start : 0,
    paddingBottom:
      virtualItems.length > 0
        ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
        : 0,
    measureRef,
    expansionRowRef,
  };
}
