'use client';

import { DataTable, type DataTableColumn, resolveFilters, useDataTableFilters } from '__PACKAGE__';
import { Code, Stack, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import type { Employee } from '~/data';
import { type EmployeeSearchRequest, loadDepartmentOptions, searchEmployees } from './api';

const PAGE_SIZE = 10;

const columns: DataTableColumn<Employee>[] = [
  {
    accessor: 'name',
    render: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    filter: { type: 'text' },
  },
  { accessor: 'email', filter: { type: 'text' } },
  {
    accessor: 'department.name',
    title: 'Department',
    filter: { type: 'select', loadOptions: loadDepartmentOptions, optionsLimit: 8 },
  },
  {
    accessor: 'birthDate',
    render: ({ birthDate }) => dayjs(birthDate).format('MMM D, YYYY'),
    filter: { type: 'date' },
  },
];

export function ColumnFiltersServerSideExample() {
  const { filters, setFilters } = useDataTableFilters();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ records: Employee[]; total: number }>();
  const [fetching, setFetching] = useState(false);

  // Relative dates such as "last 7 days" become absolute ISO ranges here
  const request: EmployeeSearchRequest = { page, pageSize: PAGE_SIZE, filters: resolveFilters(filters, { columns }) };
  const requestJson = JSON.stringify(request);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    searchEmployees(JSON.parse(requestJson)).then((response) => {
      if (cancelled) return;
      setResult(response);
      setFetching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestJson]);

  return (
    <Stack>
      <DataTable
        height={420}
        withTableBorder
        withColumnBorders
        columns={columns}
        records={result?.records}
        fetching={fetching}
        filters={filters}
        onFiltersChange={setFilters}
        withFilterChips
        highlightFilterMatches
        page={page}
        onPageChange={setPage}
        totalRecords={result?.total}
        recordsPerPage={PAGE_SIZE}
      />
      <Text size="sm">Request sent to the server:</Text>
      <Code block>{JSON.stringify(request, null, 2)}</Code>
    </Stack>
  );
}
