import type { Virtualizer } from '@tanstack/react-virtual';

export type DataTableVirtualizer = Virtualizer<HTMLElement, HTMLTableRowElement>;

export type DataTableVirtualizationProps = {
  /**
   * If true, table rows will be virtualized with `@tanstack/react-virtual`: only the rows
   * intersecting the scrollable viewport (plus a configurable overscan) are rendered in the DOM,
   * which dramatically improves performance for tables with thousands of records.
   * Make sure the table is vertically scrollable (i.e. has a constrained `height` or `maxHeight`),
   * otherwise all rows will be considered visible.
   */
  virtualized?: boolean;

  /**
   * Row height in pixels used by the virtualizer for rows that have not been measured.
   * By default the first rendered row is measured once and its height is used for all rows,
   * so this only needs to be set when the table starts empty or rows differ a lot in height.
   */
  virtualizedRowHeight?: number;

  /**
   * If true, every rendered row is measured and re-measured on resize, so rows may have
   * different heights. Costs a ResizeObserver per rendered row and can shift the scroll
   * position while scrolling, so leave it off for uniform rows.
   * @default true when `rowExpansion` is set, false otherwise
   */
  virtualizedMeasureRows?: boolean;

  /**
   * Number of extra rows to render above and below the visible area when virtualization
   * is enabled.
   * @default 15
   */
  virtualizedOverscan?: number;

  /**
   * Ref exposing the underlying `@tanstack/react-virtual` virtualizer instance when
   * virtualization is enabled.
   * Useful for imperative interactions, such as `scrollToIndex()`.
   */
  virtualizerRef?: React.RefObject<DataTableVirtualizer | null>;
};
