import { Collapse, TableTd, TableTr } from '@mantine/core';
import { useRowExpansionStatus } from './hooks';
import type { DataTableRowExpansionCollapseProps } from './types';

type DataTableRowExpansionProps = {
  open: boolean;
  colSpan: number;
  content: () => React.ReactNode;
  collapseProps: DataTableRowExpansionCollapseProps | undefined;
  odd: true | undefined;
  rowRef?: React.Ref<HTMLTableRowElement>;
};

export function DataTableRowExpansion({
  open,
  colSpan,
  content,
  collapseProps,
  odd,
  rowRef,
}: DataTableRowExpansionProps) {
  const { expanded, visible } = useRowExpansionStatus(open, collapseProps?.transitionDuration);

  return visible ? (
    <TableTr ref={rowRef} data-odd={odd}>
      <TableTd className="mantine-datatable-row-expansion-cell" colSpan={colSpan}>
        <Collapse expanded={expanded} {...collapseProps}>
          <div className="mantine-datatable-row-expansion-cell-content">{content()}</div>
        </Collapse>
      </TableTd>
    </TableTr>
  ) : null;
}
