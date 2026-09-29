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
  useLastSelectionChangeIndex,
  useRowExpansion,
  useRowVirtualization,
  useStableValue,
} from './hooks';
import type { DataTableProps } from './types';
import { TEXT_SELECTION_DISABLED } from './utilityClasses';
import { differenceBy, flattenColumns, getRecordId, uniqBy } from './utils';

const DEFAULT_ALL_RECORDS_SELECTION_CHECKBOX_PROPS = { 'aria-label': 'Select all records' };
const DEFAULT_GET_RECORD_SELECTION_CHECKBOX_PROPS = (_: unknown, index: number) => ({
  'aria-label': `Select record ${index + 1}`,
});

/** Shallow-compare two plain objects by reference-equality of their values. */
function shallowEqualObjects(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

/**
 * Return a stable reference for an object: only updates when the object is
 * not shallowly equal to the previous value.  This prevents inline JSX object
 * literals like `selectionCheckboxProps={{ size: 'sm' }}` from busting
 * React.memo on child rows every render.
 */
function useShallowStableObject<T extends Record<string, unknown> | undefined>(value: T): T {
  const ref = useRef(value);
  if (!shallowEqualObjects(ref.current as Record<string, unknown> | undefined, value as Record<string, unknown> | undefined)) {
    ref.current = value;
  }
  return ref.current as T;
}

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
  allRecordsSelectionCheckboxProps = DEFAULT_ALL_RECORDS_SELECTION_CHECKBOX_PROPS,
  getRecordSelectionCheckboxProps = DEFAULT_GET_RECORD_SELECTION_CHECKBOX_PROPS,
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
  paginationText = ({ from, to, totalRecords }) => `${from} - ${to} / ${totalRecords}`,
  paginationWrapBreakpoint = 'sm',
  getPaginationControlProps = (control) => {
    if (control === 'previous') {
      return { 'aria-label': 'Previous page' };
    } else if (control === 'next') {
      return { 'aria-label': 'Next page' };
    }
    return {};
  },
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

  const { refs, onScroll: handleScrollPositionChange } = useDataTableInjectCssVariables({
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
    headerRef: refs.header as RefObject<HTMLTableSectionElement | null>,
    scrollViewportRef: refs.scrollViewport as RefObject<HTMLElement | null>,
  });

  // Use the columns enriched with order/visibility/width from the hook so
  // resize widths actually reach the rendered <th>/<td> cells.
  //
  // Split into two references:
  // - effectiveColumns: always fresh — used by the header/footer so that dynamic
  //   column props (filtering, filter closures, title, etc.) always render correctly.
  // - effectiveColumnsStable: memoized by structural key — used by DataTableRow so
  //   that React.memo on rows is not busted on every parent render (only breaks when
  //   accessor/hidden/width/pinned actually change).
  const effectiveColumns = dragToggle.effectiveColumns;
  const effectiveColumnsKey = effectiveColumns
    .map((c) => `${String(c.accessor)}|${c.hidden ?? 0}|${String(c.width ?? '')}|${c.pinned ?? ''}`)
    .join('\0');
  // biome-ignore lint/correctness/useExhaustiveDependencies: content key is the dep
  const effectiveColumnsStable = useMemo(() => effectiveColumns, [effectiveColumnsKey]);

  const mergedTableRef = useMergedRef(refs.table, tableRef);
  const mergedViewportRef = useMergedRef(refs.scrollViewport, scrollViewportRef);
  const internalBodyRef = useRef<HTMLTableSectionElement>(null);
  const mergedBodyRef = useMergedRef(internalBodyRef, bodyRef);
  const rowExpansionInfo = useRowExpansion<T>({ rowExpansion, records, idAccessor });

  const { pinnedMap, hasLeftPinned, hasRightPinned } = useDataTablePinnedColumns({
    columns: effectiveColumns,
    theadRef: refs.header as RefObject<HTMLTableSectionElement | null>,
    tbodyRef: internalBodyRef,
    selectionColumnHeaderRef: refs.selectionColumnHeader as RefObject<HTMLTableCellElement | null>,
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

  const rowVirtualization = useRowVirtualization({
    enabled: !!virtualized,
    count: recordsLength ?? 0,
    scrollViewportRef: refs.scrollViewport as RefObject<HTMLElement | null>,
    rowHeight: virtualizedRowHeight,
    overscan: virtualizedOverscan,
    getItemKey: records ? (index) => getRecordId(records[index], idAccessor) as string | number : undefined,
    virtualizerRef,
  });

  // Reset scroll position when changing pages (sync) or when records change (async)
  useLayoutEffect(() => {
    if (!resetScrollPending.current) return;
    if (fetching) return;
    if (records === recordsAtPageChangeRef.current) return;

    const viewport = refs.scrollViewport.current;
    if (!viewport) return;

    const raf = requestAnimationFrame(() => {
      viewport.scrollTo({ top: 0, left: 0 });
      resetScrollPending.current = false;
    });

    return () => cancelAnimationFrame(raf);
  }, [fetching, records, refs.scrollViewport]);

  // The virtualizer re-renders the component on every scroll frame, so anything derived from
  // records/selectedRecords must be memoized and selection lookups must be O(1); otherwise
  // large datasets with selection enabled degrade to quadratic work per frame.
  const recordIds = useMemo(() => records?.map((record) => getRecordId(record, idAccessor)), [records, idAccessor]);
  const selectionColumnVisible = !!selectedRecords;
  const selectedRecordIdsSet = useMemo(
    () => (selectedRecords ? new Set(selectedRecords.map((record) => getRecordId(record, idAccessor))) : undefined),
    [selectedRecords, idAccessor]
  );
  const hasRecordsAndSelectedRecords =
    recordIds !== undefined && selectedRecordIdsSet !== undefined && selectedRecordIdsSet.size > 0;

  const selectableRecords = useMemo(
    () => (isRecordSelectable ? records?.filter(isRecordSelectable) : records),
    [records, isRecordSelectable]
  );
  const selectableRecordIds = useMemo(
    () => selectableRecords?.map((record) => getRecordId(record, idAccessor)),
    [selectableRecords, idAccessor]
  );

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

  const { lastSelectionChangeIndex, setLastSelectionChangeIndex } = useLastSelectionChangeIndex(recordIds);
  const selectorCellShadowVisible = selectionColumnVisible && !hasLeftPinned;

  const marginProperties = { m, my, mx, mt, mb, ml, mr };

  const spacerRowColSpan = effectiveColumns.filter(({ hidden }) => !hidden).length + (selectionColumnVisible ? 1 : 0);

  // Stabilize user-provided props that are commonly passed as inline literals
  const stableSelectionCheckboxProps = useShallowStableObject(selectionCheckboxProps as Record<string, unknown> | undefined) as typeof selectionCheckboxProps;

  // --- Stable selection handler via refs ---
  const selectedRecordsRef = useStableValue(selectedRecords);
  const selectedRecordIdsRef = useStableValue(selectedRecordIdsSet);
  const lastSelectionChangeIndexRef = useStableValue(lastSelectionChangeIndex);
  const recordsRef = useStableValue(records);
  const onSelectedRecordsChangeRef = useStableValue(onSelectedRecordsChange);
  const isRecordSelectableRef = useStableValue(isRecordSelectable);
  const getRecordSelectionCheckboxPropsRef = useStableValue(getRecordSelectionCheckboxProps);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const stableGetRecordSelectionCheckboxProps = useCallback(
    (record: T, index: number) => getRecordSelectionCheckboxPropsRef.current(record, index),
    []
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const _isRecordSelectableWrapper = useCallback(
    (record: T, index: number) => isRecordSelectableRef.current?.(record, index) ?? true,
    []
  );
  const stableIsRecordSelectable = isRecordSelectable ? _isRecordSelectableWrapper : undefined;

  const handleSelectionChange = useCallback(
    (record: T, index: number, e: React.MouseEvent) => {
      const onChangeRec = onSelectedRecordsChangeRef.current;
      if (!onChangeRec) return;
      const currentSelected = selectedRecordsRef.current;
      if (!currentSelected) return;
      const recordId = getRecordId(record, idAccessor);
      const isSelected = selectedRecordIdsRef.current?.has(recordId) || false;
      const isSelectable = isRecordSelectableRef.current;

      if (e.nativeEvent.shiftKey && lastSelectionChangeIndexRef.current !== null) {
        const lastIdx = lastSelectionChangeIndexRef.current;
        const currentRecords = recordsRef.current!;
        const targetRecords = currentRecords.filter(
          index > lastIdx
            ? (rec: T, idx: number) =>
                idx >= lastIdx && idx <= index && (isSelectable ? isSelectable(rec, idx) : true)
            : (rec: T, idx: number) =>
                idx >= index && idx <= lastIdx && (isSelectable ? isSelectable(rec, idx) : true)
        );
        onChangeRec(
          isSelected
            ? differenceBy(currentSelected, targetRecords, (r) => getRecordId(r, idAccessor))
            : uniqBy([...currentSelected, ...targetRecords], (r) => getRecordId(r, idAccessor))
        );
      } else {
        onChangeRec(
          isSelected
            ? currentSelected.filter((rec: T) => getRecordId(rec, idAccessor) !== recordId)
            : uniqBy([...currentSelected, record], (rec) => getRecordId(rec, idAccessor))
        );
      }
      setLastSelectionChangeIndex(index);
    },
    // idAccessor is typically a stable string ('id'); setLastSelectionChangeIndex is a useState setter
    // biome-ignore lint/correctness/useExhaustiveDependencies: all other deps are read via refs
    [idAccessor, setLastSelectionChangeIndex]
  );

  const stableSelectionChange = onSelectedRecordsChange && selectedRecords ? handleSelectionChange : undefined;

  // --- Stable row event handlers via refs ---
  const onRowClickRef = useStableValue(onRowClick);
  const onRowDoubleClickRef = useStableValue(onRowDoubleClick);
  const onRowContextMenuRef = useStableValue(onRowContextMenu);
  const onCellClickRef = useStableValue(onCellClick);
  const onCellDoubleClickRef = useStableValue(onCellDoubleClick);
  const onCellContextMenuRef = useStableValue(onCellContextMenu);

  // Always-created stable wrappers; only forwarded when the original prop is truthy
  // (so DataTableRow's cursor/expansion logic still sees undefined when there's no handler)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const _rowClickWrapper = useCallback(
    (args: Parameters<NonNullable<typeof onRowClick>>[0]) => onRowClickRef.current?.(args),
    []
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const _rowDoubleClickWrapper = useCallback(
    (args: Parameters<NonNullable<typeof onRowDoubleClick>>[0]) => onRowDoubleClickRef.current?.(args),
    []
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const _rowContextMenuWrapper = useCallback(
    (args: Parameters<NonNullable<typeof onRowContextMenu>>[0]) => onRowContextMenuRef.current?.(args),
    []
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const _cellClickWrapper = useCallback(
    (args: Parameters<NonNullable<typeof onCellClick>>[0]) => onCellClickRef.current?.(args),
    []
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const _cellDoubleClickWrapper = useCallback(
    (args: Parameters<NonNullable<typeof onCellDoubleClick>>[0]) => onCellDoubleClickRef.current?.(args),
    []
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally stable — reads via ref
  const _cellContextMenuWrapper = useCallback(
    (args: Parameters<NonNullable<typeof onCellContextMenu>>[0]) => onCellContextMenuRef.current?.(args),
    []
  );
  // Expose conditionally so downstream undefined checks remain correct
  const stableOnRowClick = onRowClick ? _rowClickWrapper : undefined;
  const stableOnRowDoubleClick = onRowDoubleClick ? _rowDoubleClickWrapper : undefined;
  const stableOnRowContextMenu = onRowContextMenu ? _rowContextMenuWrapper : undefined;
  const stableOnCellClick = onCellClick ? _cellClickWrapper : undefined;
  const stableOnCellDoubleClick = onCellDoubleClick ? _cellDoubleClickWrapper : undefined;
  const stableOnCellContextMenu = onCellContextMenu ? _cellContextMenuWrapper : undefined;

  const renderRow = (record: T, index: number) => {
    const recordId = getRecordId(record, idAccessor);
    const isSelected = selectedRecordIdsSet?.has(recordId) || false;

    return (
      <DataTableRow<T>
        key={recordId as React.Key}
        record={record}
        index={index}
        columns={effectiveColumnsStable}
        defaultColumnProps={defaultColumnProps}
        pinnedMap={pinnedMap}
        defaultColumnRender={defaultColumnRender}
        selectionTrigger={selectionTrigger}
        selectionVisible={selectionColumnVisible}
        selectionChecked={isSelected}
        onSelectionChange={stableSelectionChange}
        isRecordSelectable={stableIsRecordSelectable}
        selectionCheckboxProps={stableSelectionCheckboxProps}
        getSelectionCheckboxProps={stableGetRecordSelectionCheckboxProps}
        onClick={stableOnRowClick}
        onDoubleClick={stableOnRowDoubleClick}
        onCellClick={stableOnCellClick}
        onCellDoubleClick={stableOnCellDoubleClick}
        onContextMenu={stableOnRowContextMenu}
        onCellContextMenu={stableOnCellContextMenu}
        expansion={rowExpansionInfo}
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
        virtualizedMeasureRef={rowVirtualization ? rowVirtualization.measureRef : undefined}
        virtualizedOdd={rowVirtualization ? index % 2 === 0 : undefined}
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
        ref={refs.root}
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
          onScroll={handleScrollPositionChange}
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
                    ref={refs.header}
                    selectionColumnHeaderRef={refs.selectionColumnHeader}
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
                    selectionCheckboxProps={{ ...stableSelectionCheckboxProps, ...allRecordsSelectionCheckboxProps }}
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
                        <DataTableSpacerRow height={rowVirtualization.paddingTop} colSpan={spacerRowColSpan} />
                      )}
                      {rowVirtualization.virtualItems.map(({ index }) => renderRow(records![index], index))}
                      {rowVirtualization.paddingBottom > 0 && (
                        <DataTableSpacerRow height={rowVirtualization.paddingBottom} colSpan={spacerRowColSpan} />
                      )}
                    </>
                  ) : (
                    records.map((record, index) => renderRow(record, index))
                  )
                ) : (
                  <DataTableEmptyRow />
                )}
              </tbody>

              {effectiveColumns.some(({ footer }) => footer) && (
                <DataTableFooter<T>
                  ref={refs.footer}
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
