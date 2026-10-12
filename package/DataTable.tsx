import { Box, type MantineSize, Table } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';
import clsx from 'clsx';
import type { RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { getTableCssVariables } from './cssVariables';
import { DataTableColumnsProvider } from './DataTableDragToggleProvider';
import { DataTableEmptyRow } from './DataTableEmptyRow';
import { DataTableEmptyState } from './DataTableEmptyState';
import { DataTableFooter } from './DataTableFooter';
import { DataTableHeader } from './DataTableHeader';
import { DataTableLoader } from './DataTableLoader';
import { DataTablePagination } from './DataTablePagination';
import { DataTableRow } from './DataTableRow';
import { DataTableScrollArea } from './DataTableScrollArea';
import { DataTableSpacerRow } from './DataTableSpacerRow';
import {
  useDataTableColumns,
  useDataTableInjectCssVariables,
  useDataTablePinnedColumns,
  useOptionalCallbackRef,
  useRowExpansion,
  useRowVirtualization,
  useStableCallback,
} from './hooks';
import type { DataTableProps } from './types';
import { TEXT_SELECTION_DISABLED } from './utilityClasses';
import { differenceBy, flattenColumns, getRecordId, uniqBy } from './utils';

const defaultAllRecordsSelectionCheckboxProps: NonNullable<
  DataTableProps<unknown>['allRecordsSelectionCheckboxProps']
> = { 'aria-label': 'Select all records' };

const defaultGetRecordSelectionCheckboxProps: NonNullable<
  DataTableProps<unknown>['getRecordSelectionCheckboxProps']
> = (_, index) => ({ 'aria-label': `Select record ${index + 1}` });

const defaultPaginationText: NonNullable<DataTableProps<unknown>['paginationText']> = ({ from, to, totalRecords }) =>
  `${from} - ${to} / ${totalRecords}`;

const defaultGetPaginationControlProps: NonNullable<DataTableProps<unknown>['getPaginationControlProps']> = (
  control
) => {
  if (control === 'previous') {
    return { 'aria-label': 'Previous page' };
  } else if (control === 'next') {
    return { 'aria-label': 'Next page' };
  }
  return {};
};

export function DataTable<T>({
  withTableBorder,
  borderRadius,
  textSelectionDisabled,
  height = '100%',
  minHeight,
  maxHeight,
  shadow,
  verticalAlign = 'center',
  fetching,
  columns,
  storeColumnsKey,
  groups,
  pinFirstColumn,
  pinLastColumn,
  defaultColumnProps,
  defaultColumnRender,
  idAccessor = 'id',
  records,
  selectionTrigger = 'checkbox',
  selectedRecords,
  onSelectedRecordsChange,
  selectionColumnClassName,
  selectionColumnStyle,
  isRecordSelectable,
  selectionCheckboxProps,
  allRecordsSelectionCheckboxProps = defaultAllRecordsSelectionCheckboxProps,
  getRecordSelectionCheckboxProps = defaultGetRecordSelectionCheckboxProps,
  sortStatus,
  sortIcons,
  onSortStatusChange,
  horizontalSpacing,
  page,
  onPageChange,
  totalRecords,
  recordsPerPage,
  onRecordsPerPageChange,
  recordsPerPageOptions,
  recordsPerPageLabel = 'Records per page',
  paginationWithEdges,
  paginationWithControls,
  paginationActiveTextColor,
  paginationActiveBackgroundColor,
  paginationSize = 'sm',
  paginationText = defaultPaginationText,
  paginationWrapBreakpoint = 'sm',
  getPaginationControlProps = defaultGetPaginationControlProps,
  getPaginationItemProps,
  renderPagination,
  loaderBackgroundBlur,
  customLoader,
  loaderSize,
  loaderType,
  loaderColor,
  loadingText = '...',
  emptyState,
  noRecordsText = 'No records',
  noRecordsIcon,
  highlightOnHover,
  striped,
  noHeader,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  onCellClick,
  onCellDoubleClick,
  onCellContextMenu,
  onScroll,
  onScrollToTop,
  onScrollToBottom,
  onScrollToLeft,
  onScrollToRight,
  c,
  backgroundColor,
  borderColor,
  rowBorderColor,
  stripedColor,
  highlightOnHoverColor,
  rowColor,
  rowBackgroundColor,
  rowExpansion,
  rowClassName,
  rowStyle,
  customRowAttributes,
  scrollViewportRef,
  scrollAreaProps,
  tableRef,
  bodyRef,
  m,
  my,
  mx,
  mt,
  mb,
  ml,
  mr,
  className,
  classNames,
  style,
  styles,
  rowFactory,
  tableWrapper,
  virtualized,
  virtualizedRowHeight = 40,
  virtualizedOverscan = 15,
  virtualizerRef,
  ...otherProps
}: DataTableProps<T>) {
  const flatColumns = useMemo(() => {
    return groups ? flattenColumns(groups) : columns!;
  }, [columns, groups]);

  const {
    refs: {
      root: rootElementRef,
      table: tableElementRef,
      scrollViewport: scrollViewportElementRef,
      header: headerElementRef,
      selectionColumnHeader: selectionColumnHeaderElementRef,
    },
    trackedRefs: {
      scrollViewport: trackedScrollViewportRef,
      header: trackedHeaderRef,
      footer: trackedFooterRef,
      selectionColumnHeader: trackedSelectionColumnHeaderRef,
    },
    trackedElements: { scrollViewport: scrollViewportElement, header: headerElement, footer: footerElement },
    onScroll: handleScrollPositionChange,
  } = useDataTableInjectCssVariables({
    scrollCallbacks: {
      onScroll,
      onScrollToTop,
      onScrollToBottom,
      onScrollToLeft,
      onScrollToRight,
    },
    withRowBorders: otherProps.withRowBorders,
  });

  const dragToggle = useDataTableColumns({
    key: storeColumnsKey,
    columns: flatColumns,
    headerRef: headerElementRef as RefObject<HTMLTableSectionElement | null>,
    scrollViewportRef: scrollViewportElementRef as RefObject<HTMLElement | null>,
  });

  // Use the columns enriched with order/visibility/width from the hook so
  // resize widths actually reach the rendered <th>/<td> cells.
  const effectiveColumns = dragToggle.effectiveColumns;
  const hasFooter = effectiveColumns.some(({ footer }) => footer);

  const mergedTableRef = useMergedRef(tableElementRef, tableRef);
  const mergedViewportRef = useMergedRef(trackedScrollViewportRef, scrollViewportRef);
  const internalBodyRef = useRef<HTMLTableSectionElement>(null);
  const mergedBodyRef = useMergedRef(internalBodyRef, bodyRef);
  const { expansion: rowExpansionInfo, isRecordIdExpanded } = useRowExpansion<T>({ rowExpansion, records, idAccessor });

  const { pinnedMap, hasLeftPinned, hasRightPinned } = useDataTablePinnedColumns({
    columns: effectiveColumns,
    theadRef: headerElementRef as RefObject<HTMLTableSectionElement | null>,
    tbodyRef: internalBodyRef,
    selectionColumnHeaderRef: selectionColumnHeaderElementRef as RefObject<HTMLTableCellElement | null>,
    selectionVisible: !!selectedRecords,
    pinFirstColumn,
    pinLastColumn,
  });

  // Track when we should reset scroll due to pagination, but defer until data is rendered
  const resetScrollPending = useRef(false);
  const prevPageRef = useRef(page);
  const recordsAtPageChangeRef = useRef<typeof records | undefined>(records);

  const handlePageChange = useCallback(
    (newPage: number) => {
      resetScrollPending.current = true;
      recordsAtPageChangeRef.current = records;
      onPageChange!(newPage);
    },
    [onPageChange, records]
  );

  // Handle externally-driven page changes
  useEffect(() => {
    if (prevPageRef.current !== page) {
      resetScrollPending.current = true;
      recordsAtPageChangeRef.current = records;
      prevPageRef.current = page;
    }
  }, [page, records]);

  const recordsLength = records?.length;

  // The virtualizer recomputes all item offsets whenever `getItemKey`'s identity changes.
  const getVirtualItemKey = useMemo(
    () => (records ? (index: number) => getRecordId(records[index], idAccessor) as string | number : undefined),
    [records, idAccessor]
  );

  const rowVirtualization = useRowVirtualization({
    enabled: !!virtualized,
    count: recordsLength ?? 0,
    scrollElement: scrollViewportElement,
    headerElement,
    footerElement,
    rowHeight: virtualizedRowHeight,
    overscan: virtualizedOverscan,
    getItemKey: getVirtualItemKey,
    virtualizerRef,
  });

  // Reset scroll position when changing pages (sync) or when records change (async)
  useLayoutEffect(() => {
    if (!resetScrollPending.current) return;
    if (fetching) return;
    if (records === recordsAtPageChangeRef.current) return;

    const viewport = scrollViewportElementRef.current;
    if (!viewport) return;

    const raf = requestAnimationFrame(() => {
      viewport.scrollTo({ top: 0, left: 0 });
      resetScrollPending.current = false;
    });

    return () => cancelAnimationFrame(raf);
  }, [fetching, records, scrollViewportElementRef]);

  const selectionColumnVisible = !!selectedRecords;
  const selectedRecordIdsSet = selectedRecords
    ? new Set(selectedRecords.map((record) => getRecordId(record, idAccessor)))
    : undefined;
  const hasRecordsAndSelectedRecords =
    records !== undefined && selectedRecordIdsSet !== undefined && selectedRecordIdsSet.size > 0;

  const selectableRecords = isRecordSelectable ? records?.filter(isRecordSelectable) : records;
  const selectableRecordIds = selectableRecords?.map((record) => getRecordId(record, idAccessor));

  const allSelectableRecordsSelected =
    hasRecordsAndSelectedRecords && selectableRecordIds!.every((id) => selectedRecordIdsSet.has(id));
  const someRecordsSelected =
    hasRecordsAndSelectedRecords && selectableRecordIds!.some((id) => selectedRecordIdsSet.has(id));

  const handleHeaderSelectionChange = useCallback(() => {
    if (selectedRecords && onSelectedRecordsChange) {
      const selectableRecordIdsSet = new Set(selectableRecordIds);
      onSelectedRecordsChange(
        allSelectableRecordsSelected
          ? selectedRecords.filter((record) => !selectableRecordIdsSet.has(getRecordId(record, idAccessor)))
          : uniqBy([...selectedRecords, ...selectableRecords!], (record) => getRecordId(record, idAccessor))
      );
    }
  }, [
    allSelectableRecordsSelected,
    idAccessor,
    onSelectedRecordsChange,
    selectableRecordIds,
    selectableRecords,
    selectedRecords,
  ]);

  // Shift-click range anchor, read only in click handlers; it only counts while the same record is
  // still at that index.
  const lastSelectionChangeRef = useRef<{ index: number; id: unknown } | null>(null);

  const handleRecordSelectionChange = useStableCallback((record: T, index: number, event: React.MouseEvent) => {
    if (!selectedRecords || !onSelectedRecordsChange) return;

    const recordId = getRecordId(record, idAccessor);
    const isSelected = selectedRecordIdsSet?.has(recordId) ?? false;
    const anchor = lastSelectionChangeRef.current;
    const lastSelectionChangeIndex =
      anchor && anchor.index < records!.length && getRecordId(records![anchor.index], idAccessor) === anchor.id
        ? anchor.index
        : null;

    if (event.nativeEvent.shiftKey && lastSelectionChangeIndex !== null) {
      const [from, to] =
        index > lastSelectionChangeIndex ? [lastSelectionChangeIndex, index] : [index, lastSelectionChangeIndex];
      const targetRecords = records!.filter(
        (rec, idx) => idx >= from && idx <= to && (isRecordSelectable ? isRecordSelectable(rec, idx) : true)
      );
      onSelectedRecordsChange(
        isSelected
          ? differenceBy(selectedRecords, targetRecords, (r) => getRecordId(r, idAccessor))
          : uniqBy([...selectedRecords, ...targetRecords], (r) => getRecordId(r, idAccessor))
      );
    } else {
      onSelectedRecordsChange(
        isSelected
          ? selectedRecords.filter((rec) => getRecordId(rec, idAccessor) !== recordId)
          : uniqBy([...selectedRecords, record], (rec) => getRecordId(rec, idAccessor))
      );
    }
    lastSelectionChangeRef.current = { index, id: recordId };
  });
  const rowSelectionChangeHandler =
    selectedRecords && onSelectedRecordsChange ? handleRecordSelectionChange : undefined;

  const stableOnRowClick = useOptionalCallbackRef(onRowClick);
  const stableOnRowDoubleClick = useOptionalCallbackRef(onRowDoubleClick);
  const stableOnRowContextMenu = useOptionalCallbackRef(onRowContextMenu);
  const stableOnCellClick = useOptionalCallbackRef(onCellClick);
  const stableOnCellDoubleClick = useOptionalCallbackRef(onCellDoubleClick);
  const stableOnCellContextMenu = useOptionalCallbackRef(onCellContextMenu);

  const selectorCellShadowVisible = selectionColumnVisible && !hasLeftPinned;

  const marginProperties = { m, my, mx, mt, mb, ml, mr };

  const fullRowColSpan = effectiveColumns.filter(({ hidden }) => !hidden).length + (selectionColumnVisible ? 1 : 0);

  const renderRow = (record: T, index: number) => {
    const recordId = getRecordId(record, idAccessor);

    return (
      <DataTableRow<T>
        key={recordId as React.Key}
        record={record}
        index={index}
        columns={effectiveColumns}
        defaultColumnProps={defaultColumnProps}
        pinnedMap={pinnedMap}
        defaultColumnRender={defaultColumnRender}
        selectionTrigger={selectionTrigger}
        selectionVisible={selectionColumnVisible}
        selectionChecked={selectedRecordIdsSet?.has(recordId) ?? false}
        onSelectionChange={rowSelectionChangeHandler}
        isRecordSelectable={isRecordSelectable}
        selectionCheckboxProps={selectionCheckboxProps}
        getSelectionCheckboxProps={getRecordSelectionCheckboxProps}
        onClick={stableOnRowClick}
        onDoubleClick={stableOnRowDoubleClick}
        onCellClick={stableOnCellClick}
        onCellDoubleClick={stableOnCellDoubleClick}
        onContextMenu={stableOnRowContextMenu}
        onCellContextMenu={stableOnCellContextMenu}
        expansion={rowExpansionInfo}
        expansionColSpan={fullRowColSpan}
        expanded={isRecordIdExpanded(recordId)}
        color={rowColor}
        backgroundColor={rowBackgroundColor}
        className={rowClassName}
        style={rowStyle}
        customAttributes={customRowAttributes}
        selectorCellShadowVisible={selectorCellShadowVisible}
        selectionColumnClassName={selectionColumnClassName}
        selectionColumnStyle={selectionColumnStyle}
        idAccessor={idAccessor as string}
        rowFactory={rowFactory}
        virtualizedMeasureRef={rowVirtualization?.measureRef}
        virtualizedExpansionRowRef={rowVirtualization?.expansionRowRef}
      />
    );
  };

  const TableWrapper = useCallback(
    ({ children }: { children: React.ReactNode }) => {
      if (tableWrapper) return tableWrapper({ children });
      return children;
    },
    [tableWrapper]
  );

  return (
    <DataTableColumnsProvider {...dragToggle} pinnedMap={pinnedMap}>
      <Box
        ref={rootElementRef}
        {...marginProperties}
        className={clsx(
          'mantine-datatable',
          { 'mantine-datatable-with-border': withTableBorder },
          className,
          classNames?.root
        )}
        style={[
          (theme) => ({
            ...getTableCssVariables({
              theme,
              c,
              backgroundColor,
              borderColor,
              rowBorderColor,
              stripedColor,
              highlightOnHoverColor,
            }),
            borderRadius: theme.radius[borderRadius as MantineSize] || borderRadius,
            boxShadow: theme.shadows[shadow as MantineSize] || shadow,
            height,
            minHeight,
            maxHeight,
          }),
          style,
          styles?.root,
          {
            position: 'relative',
          },
        ]}
      >
        <DataTableScrollArea
          viewportRef={mergedViewportRef}
          leftShadowBehind={selectionColumnVisible || hasLeftPinned}
          rightShadowBehind={hasRightPinned}
          onScrollPositionChange={handleScrollPositionChange}
          scrollAreaProps={scrollAreaProps}
        >
          <TableWrapper>
            <Table
              ref={mergedTableRef}
              horizontalSpacing={horizontalSpacing}
              className={clsx(
                'mantine-datatable-table',
                {
                  [TEXT_SELECTION_DISABLED]: textSelectionDisabled,
                  'mantine-datatable-vertical-align-top': verticalAlign === 'top',
                  'mantine-datatable-vertical-align-bottom': verticalAlign === 'bottom',
                  'mantine-datatable-selection-column-visible': selectionColumnVisible,
                  'mantine-datatable-resizable-columns': dragToggle.hasResizableColumns,
                  'mantine-datatable-resize-locked': dragToggle.isLocked,
                  'mantine-datatable-resizing': dragToggle.isResizing,
                },
                classNames?.table
              )}
              style={{
                ...styles?.table,
                ...(dragToggle.isLocked ? { tableLayout: 'fixed' } : null),
                ...(dragToggle.tableWidth != null ? { width: `${dragToggle.tableWidth}px` } : null),
              }}
              data-striped={(recordsLength && striped) || undefined}
              data-highlight-on-hover={highlightOnHover || undefined}
              data-virtualized={virtualized || undefined}
              {...otherProps}
            >
              {noHeader ? null : (
                <DataTableColumnsProvider {...dragToggle} pinnedMap={pinnedMap}>
                  <DataTableHeader<T>
                    ref={trackedHeaderRef}
                    selectionColumnHeaderRef={trackedSelectionColumnHeaderRef}
                    className={classNames?.header}
                    style={styles?.header}
                    columns={effectiveColumns}
                    defaultColumnProps={defaultColumnProps}
                    groups={groups}
                    pinnedMap={pinnedMap}
                    sortStatus={sortStatus}
                    sortIcons={sortIcons}
                    onSortStatusChange={onSortStatusChange}
                    selectionTrigger={selectionTrigger}
                    selectionVisible={selectionColumnVisible}
                    selectionChecked={allSelectableRecordsSelected}
                    selectionIndeterminate={someRecordsSelected && !allSelectableRecordsSelected}
                    onSelectionChange={handleHeaderSelectionChange}
                    selectionCheckboxProps={{ ...selectionCheckboxProps, ...allRecordsSelectionCheckboxProps }}
                    selectorCellShadowVisible={selectorCellShadowVisible}
                    selectionColumnClassName={selectionColumnClassName}
                    selectionColumnStyle={selectionColumnStyle}
                    withColumnBorders={otherProps.withColumnBorders}
                  />
                </DataTableColumnsProvider>
              )}
              <tbody ref={mergedBodyRef}>
                {recordsLength ? (
                  rowVirtualization ? (
                    <>
                      {rowVirtualization.paddingTop > 0 && (
                        <DataTableSpacerRow height={rowVirtualization.paddingTop} colSpan={fullRowColSpan} />
                      )}
                      {rowVirtualization.virtualItems.map(({ index }) => renderRow(records![index], index))}
                      {rowVirtualization.paddingBottom > 0 && (
                        <DataTableSpacerRow height={rowVirtualization.paddingBottom} colSpan={fullRowColSpan} />
                      )}
                    </>
                  ) : (
                    records.map((record, index) => renderRow(record, index))
                  )
                ) : (
                  <DataTableEmptyRow />
                )}
              </tbody>

              {hasFooter && (
                <DataTableFooter<T>
                  ref={trackedFooterRef}
                  className={classNames?.footer}
                  style={styles?.footer}
                  columns={effectiveColumns}
                  defaultColumnProps={defaultColumnProps}
                  pinnedMap={pinnedMap}
                  selectionVisible={selectionColumnVisible}
                  selectorCellShadowVisible={selectorCellShadowVisible}
                />
              )}
            </Table>
          </TableWrapper>
        </DataTableScrollArea>
        {!!(page && recordsLength) && (
          <DataTablePagination
            className={classNames?.pagination}
            style={styles?.pagination}
            horizontalSpacing={horizontalSpacing}
            fetching={fetching}
            page={page}
            onPageChange={handlePageChange}
            totalRecords={totalRecords}
            recordsPerPage={recordsPerPage}
            onRecordsPerPageChange={onRecordsPerPageChange}
            recordsPerPageOptions={recordsPerPageOptions}
            recordsPerPageLabel={recordsPerPageLabel}
            paginationWithEdges={paginationWithEdges}
            paginationWithControls={paginationWithControls}
            paginationActiveTextColor={paginationActiveTextColor}
            paginationActiveBackgroundColor={paginationActiveBackgroundColor}
            paginationSize={paginationSize}
            paginationText={paginationText}
            paginationWrapBreakpoint={paginationWrapBreakpoint}
            getPaginationControlProps={getPaginationControlProps}
            getPaginationItemProps={getPaginationItemProps}
            noRecordsText={noRecordsText}
            loadingText={loadingText}
            recordsLength={recordsLength}
            renderPagination={renderPagination}
          />
        )}
        <DataTableLoader
          fetching={fetching}
          backgroundBlur={loaderBackgroundBlur}
          customContent={customLoader}
          size={loaderSize}
          type={loaderType}
          color={loaderColor}
        />
        <DataTableEmptyState icon={noRecordsIcon} text={noRecordsText} active={!fetching && !recordsLength}>
          {emptyState}
        </DataTableEmptyState>
      </Box>
    </DataTableColumnsProvider>
  );
}
