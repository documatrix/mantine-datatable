import type { Virtualizer } from '@tanstack/react-virtual';

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
   * Estimated row height in pixels, used by the virtualizer to compute the scrollable area size
   * before rows are actually measured.
   * Rendered rows are measured dynamically, so this doesn't need to be exact.
   * @default 40
   */
  virtualizedRowHeight?: number;

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
  virtualizerRef?: React.RefObject<Virtualizer<HTMLElement, HTMLTableRowElement> | null>;
};
