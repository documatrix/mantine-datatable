import { type MantineStyleProp, type MantineTheme, TableTh, TableTr } from '@mantine/core';
import { DataTableFilterEditor } from './DataTableFilterEditor';
import { DataTableFilterInput } from './DataTableFilterInput';
import { useDataTableFiltersContext } from './DataTableFilters.context';
import { DataTableFooterSelectorPlaceholderCell } from './DataTableFooterSelectorPlaceholderCell';
import { DataTableHeaderCellFilter } from './DataTableHeaderCellFilter';
import { type DataTableResolvedFilter, resolveColumnFilter } from './filters/config';
import { formatFilterCondition } from './filters/format';
import type { PinnedColumnInfo } from './hooks';
import { useMediaQueryStringOrFunction } from './hooks';
import { IconCalendar } from './icons/IconCalendar';
import type { DataTableColumn, DataTableDefaultColumnProps } from './types';
import { columnWidthValue } from './utils';

type DataTableFilterRowProps<T> = {
  columns: DataTableColumn<T>[];
  defaultColumnProps: DataTableDefaultColumnProps<T> | undefined;
  pinnedMap: Map<string, PinnedColumnInfo>;
  selectionVisible: boolean;
  selectorCellShadowVisible: boolean;
};

export function DataTableFilterRow<T>({
  columns,
  defaultColumnProps,
  pinnedMap,
  selectionVisible,
  selectorCellShadowVisible,
}: DataTableFilterRowProps<T>) {
  return (
    <TableTr className="mantine-datatable-filter-row" onContextMenu={(event) => event.stopPropagation()}>
      {selectionVisible && <DataTableFooterSelectorPlaceholderCell shadowVisible={selectorCellShadowVisible} />}
      {columns.map(({ hidden, ...columnProps }) => {
        if (hidden) return null;
        const column = { ...defaultColumnProps, ...columnProps } as DataTableColumn<T>;
        return (
          <DataTableFilterRowCell
            key={column.accessor as React.Key}
            filter={resolveColumnFilter(column)}
            accessor={String(column.accessor)}
            width={column.width}
            visibleMediaQuery={column.visibleMediaQuery}
            pinnedInfo={pinnedMap.get(String(column.accessor))}
          />
        );
      })}
    </TableTr>
  );
}

type DataTableFilterRowCellProps = {
  filter: DataTableResolvedFilter | undefined;
  accessor: string;
  width: string | number | undefined;
  visibleMediaQuery: string | ((theme: MantineTheme) => string) | undefined;
  pinnedInfo: PinnedColumnInfo | undefined;
};

function DataTableFilterRowCell({
  filter,
  accessor,
  width,
  visibleMediaQuery,
  pinnedInfo,
}: DataTableFilterRowCellProps) {
  const visible = useMediaQueryStringOrFunction(visibleMediaQuery);
  if (!visible) return null;
  const widthValue = columnWidthValue(accessor, width);
  const style: MantineStyleProp = [
    { width: widthValue, minWidth: widthValue, maxWidth: widthValue },
    pinnedInfo && { position: 'sticky', [pinnedInfo.position]: pinnedInfo.offset, overflow: 'visible' },
  ];

  return (
    <TableTh
      className="mantine-datatable-filter-row-cell"
      data-filter-accessor={accessor}
      data-pinned={pinnedInfo?.position}
      data-pinned-shadow={pinnedInfo?.isBoundary ? pinnedInfo.position : undefined}
      style={style}
    >
      {filter ? <DataTableFilterRowCellContent filter={filter} /> : null}
    </TableTh>
  );
}

function DataTableFilterRowCellContent({ filter }: { filter: DataTableResolvedFilter }) {
  const { filters, lockedFilters, setColumnConditions, texts, locale, knownOptions } = useDataTableFiltersContext();
  const conditions = filters[filter.key] ?? [];
  const lockedConditions = lockedFilters?.[filter.key];

  if (filter.type === 'custom') {
    const all = [...(lockedConditions ?? []), ...conditions];
    const summary = all
      .map((condition) =>
        formatFilterCondition(condition, filter, { texts, locale, options: knownOptions[filter.key] })
      )
      .join(', ');
    return (
      <div className="mantine-datatable-filter-row-custom">
        <span className="mantine-datatable-filter-row-summary" title={summary}>
          {summary}
        </span>
        <DataTableHeaderCellFilter
          isActive={all.length > 0}
          count={all.length}
          label={texts.editFilter(filter.label)}
          filterPopoverProps={{ closeOnEscape: false, width: 320, position: 'bottom-end' }}
        >
          {({ close }) => <DataTableFilterEditor filter={filter} close={close} />}
        </DataTableHeaderCellFilter>
      </div>
    );
  }

  const input = (
    <DataTableFilterInput
      filter={filter}
      conditions={conditions}
      lockedConditions={lockedConditions}
      onChange={(next) => setColumnConditions(filter.key, next)}
      size="xs"
      variant="row"
      withinPortal
    />
  );

  if (filter.type !== 'date' || (filter.withCalendar === false && !filter.renderPicker)) return input;

  return (
    <div className="mantine-datatable-filter-row-with-picker">
      {input}
      <DataTableHeaderCellFilter
        isActive={false}
        icon={<IconCalendar />}
        label={texts.openCalendar}
        filterPopoverProps={{ closeOnEscape: false, width: 320, position: 'bottom-end' }}
      >
        {({ close }) => <DataTableFilterEditor filter={filter} close={close} />}
      </DataTableHeaderCellFilter>
    </div>
  );
}
