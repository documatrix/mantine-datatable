import {
  Box,
  type MantineSpacing,
  type MantineStyleProp,
  Pagination,
  type PaginationProps,
  rem,
  Text,
  type TextProps,
} from '@mantine/core';
import clsx from 'clsx';
import { createContext, use } from 'react';
import { getPaginationCssVariables } from './cssVariables';
import { DataTablePageSizeSelector } from './DataTablePageSizeSelector';
import { useMediaQueryStringOrFunction } from './hooks';
import type { DataTablePaginationProps } from './types';
import type { DataTablePageSizeSelectorProps } from './types/DataTablePageSizeSelectorProps';
import type { DataTablePaginationRenderContext } from './types/DataTablePaginationRenderContext';
import type { WithOptionalProperty, WithRequiredProperty } from './types/utils';

type DataTablePaginationComponentProps = WithOptionalProperty<
  WithRequiredProperty<
    DataTablePaginationProps,
    'loadingText' | 'paginationSize' | 'recordsPerPageLabel' | 'paginationWrapBreakpoint' | 'getPaginationControlProps'
  >,
  'onRecordsPerPageChange' | 'recordsPerPageOptions' | 'renderPagination'
> & {
  className: string | undefined;
  style: MantineStyleProp | undefined;
  fetching: boolean | undefined;
  recordsLength: number | undefined;
  horizontalSpacing: MantineSpacing | undefined;
  noRecordsText: string;
};

type PaginationControlsContextValue = Pick<
  DataTablePaginationComponentProps,
  | 'paginationSize'
  | 'recordsPerPageOptions'
  | 'recordsPerPage'
  | 'onRecordsPerPageChange'
  | 'recordsPerPageLabel'
  | 'paginationActiveTextColor'
  | 'paginationActiveBackgroundColor'
  | 'paginationWithEdges'
  | 'paginationWithControls'
  | 'fetching'
  | 'recordsLength'
  | 'page'
  | 'onPageChange'
  | 'getPaginationControlProps'
  | 'getPaginationItemProps'
> & {
  paginationTextValue: React.ReactNode;
  totalPages: number;
};

const PaginationControlsContext = createContext<PaginationControlsContextValue | null>(null);

function usePaginationControlsContext() {
  const ctx = use(PaginationControlsContext);
  if (!ctx) throw new Error('Pagination controls must be rendered inside renderPagination');
  return ctx;
}

function PaginationText(props?: Partial<TextProps>) {
  const { paginationSize, paginationTextValue } = usePaginationControlsContext();
  return (
    <Text component="div" className="mantine-datatable-pagination-text" size={paginationSize} {...props}>
      {paginationTextValue}
    </Text>
  );
}

function PaginationPageSizeSelector(props?: Partial<DataTablePageSizeSelectorProps>) {
  const {
    recordsPerPageOptions,
    paginationActiveTextColor,
    paginationActiveBackgroundColor,
    paginationSize,
    recordsPerPageLabel,
    recordsPerPage,
    onRecordsPerPageChange,
  } = usePaginationControlsContext();
  return recordsPerPageOptions ? (
    <DataTablePageSizeSelector
      activeTextColor={paginationActiveTextColor}
      activeBackgroundColor={paginationActiveBackgroundColor}
      size={paginationSize}
      label={recordsPerPageLabel}
      values={recordsPerPageOptions}
      value={recordsPerPage!}
      onChange={onRecordsPerPageChange!}
      {...props}
    />
  ) : null;
}

function PaginationPages(props?: Partial<PaginationProps>) {
  const {
    fetching,
    recordsLength,
    paginationActiveTextColor,
    paginationActiveBackgroundColor,
    paginationWithEdges,
    paginationWithControls,
    page,
    onPageChange,
    paginationSize,
    totalPages,
    getPaginationControlProps,
    getPaginationItemProps,
  } = usePaginationControlsContext();
  return (
    <Pagination
      classNames={{
        root: clsx('mantine-datatable-pagination-pages', {
          'mantine-datatable-pagination-pages-fetching': fetching || !recordsLength,
        }),
        control: 'mantine-datatable-pagination-pages-control',
      }}
      style={
        paginationActiveTextColor || paginationActiveBackgroundColor
          ? (theme) =>
              getPaginationCssVariables({
                theme,
                paginationActiveTextColor,
                paginationActiveBackgroundColor,
              })
          : undefined
      }
      withEdges={paginationWithEdges}
      withControls={paginationWithControls}
      value={page}
      onChange={onPageChange}
      size={paginationSize}
      total={totalPages}
      getControlProps={getPaginationControlProps}
      getItemProps={getPaginationItemProps}
      {...props}
    />
  );
}

const Controls: DataTablePaginationRenderContext['Controls'] = {
  Text: PaginationText,
  PageSizeSelector: PaginationPageSizeSelector,
  Pagination: PaginationPages,
};

export function DataTablePagination({
  className,
  style,
  fetching,
  page,
  onPageChange,
  paginationWithEdges,
  paginationWithControls,
  paginationActiveTextColor,
  paginationActiveBackgroundColor,
  paginationSize,
  loadingText,
  noRecordsText,
  paginationText,
  totalRecords,
  recordsPerPage,
  onRecordsPerPageChange,
  recordsPerPageLabel,
  recordsPerPageOptions,
  recordsLength,
  horizontalSpacing,
  paginationWrapBreakpoint,
  getPaginationControlProps,
  getPaginationItemProps,
  renderPagination,
}: DataTablePaginationComponentProps) {
  let paginationTextValue: React.ReactNode;
  if (totalRecords) {
    const from = (page - 1) * recordsPerPage + 1;
    const to = from + (recordsLength || 0) - 1;
    paginationTextValue = paginationText!({ from, to, totalRecords });
  } else {
    paginationTextValue = fetching ? loadingText : noRecordsText;
  }

  const totalPages = totalRecords && recordsPerPage ? Math.max(1, Math.ceil(totalRecords / recordsPerPage)) : 1;

  const from = totalRecords ? (page - 1) * (recordsPerPage ?? 0) + 1 : undefined;
  const to = totalRecords ? (from ?? 1) + (recordsLength ?? 0) - 1 : undefined;

  const isAbovePaginationWrapBreakpoint = useMediaQueryStringOrFunction(
    ({ breakpoints }) =>
      `(min-width: ${
        typeof paginationWrapBreakpoint === 'number'
          ? `${rem(paginationWrapBreakpoint)}rem`
          : breakpoints[paginationWrapBreakpoint] || paginationWrapBreakpoint
      })`
  );

  const isWrapped = !isAbovePaginationWrapBreakpoint;

  const ctx: DataTablePaginationRenderContext = {
    state: {
      paginationSize,
      page,
      totalPages,
      totalRecords,
      recordsPerPage,
      recordsLength,
      fetching,
      from,
      to,
      isWrapped,
    },
    actions: {
      setPage: (n) => onPageChange?.(n),
      setRecordsPerPage: onRecordsPerPageChange ? (n) => onRecordsPerPageChange(n) : undefined,
    },
    Controls,
  };

  const controls: PaginationControlsContextValue = {
    paginationTextValue,
    paginationSize,
    recordsPerPageOptions,
    recordsPerPage,
    onRecordsPerPageChange,
    recordsPerPageLabel,
    paginationActiveTextColor,
    paginationActiveBackgroundColor,
    paginationWithEdges,
    paginationWithControls,
    fetching,
    recordsLength,
    page,
    onPageChange,
    totalPages,
    getPaginationControlProps,
    getPaginationItemProps,
  };

  return (
    <Box
      px={horizontalSpacing ?? 'xs'}
      py="xs"
      className={clsx('mantine-datatable-pagination', className)}
      style={[{ flexDirection: isWrapped ? 'column' : 'row' }, style]}
    >
      <PaginationControlsContext value={controls}>
        {typeof renderPagination === 'function' ? (
          renderPagination(ctx)
        ) : (
          <>
            <Controls.Text />
            <Controls.PageSizeSelector />
            <Controls.Pagination />
          </>
        )}
      </PaginationControlsContext>
    </Box>
  );
}
