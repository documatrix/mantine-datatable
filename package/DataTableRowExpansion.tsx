import { Collapse, TableTd, TableTr } from '@mantine/core';
import { useRowExpansionStatus } from './hooks';
import type { DataTableRowExpansionCollapseProps } from './types';

type DataTableRowExpansionProps = {
  open: boolean;
  colSpan: number;
  content: () => React.ReactNode;
  collapseProps: DataTableRowExpansionCollapseProps | undefined;
  /**
   * Parent row parity when virtualization is enabled; drives index-based striping
   * (`data-odd`), so the expansion row inherits the parent row's stripe, as the
   * `:nth-of-type`-based striping does in the non-virtualized mode.
   */
  virtualizedOdd?: boolean;
};

export function DataTableRowExpansion({
  open,
  colSpan,
  content,
  collapseProps,
  virtualizedOdd,
}: DataTableRowExpansionProps) {
  const { expanded, visible } = useRowExpansionStatus(open, collapseProps?.transitionDuration);

  return visible ? (
    <>
      {/* add an empty row to maintain striped rows consistency */}
      <TableTr />
      <TableTr data-odd={virtualizedOdd || undefined}>
        <TableTd className="mantine-datatable-row-expansion-cell" colSpan={colSpan}>
          <Collapse expanded={expanded} {...collapseProps}>
            <div className="mantine-datatable-row-expansion-cell-content">{content()}</div>
          </Collapse>
        </TableTd>
      </TableTr>
    </>
  ) : null;
}
