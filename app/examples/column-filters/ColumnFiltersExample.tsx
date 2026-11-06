'use client';

import {
  DataTable,
  type DataTableColumn,
  type DataTableFilterOption,
  type DataTableFilters,
  filterRecords,
  useDataTableFilters,
} from '__PACKAGE__';
import { Code, Group, SegmentedControl, Stack, Switch } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { companies, type Employee, employees } from '~/data';

const PAGE_SIZE = 15;

function countBy(getValue: (employee: Employee) => string): DataTableFilterOption[] {
  const counts = new Map<string, number>();
  for (const employee of employees) {
    const value = getValue(employee);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => ({ value, label: value, count }));
}

const columns: DataTableColumn<Employee>[] = [
  {
    accessor: 'name',
    width: 200,
    render: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    filter: { type: 'text', getValue: ({ firstName, lastName }) => `${firstName} ${lastName}` },
  },
  { accessor: 'email', filter: { type: 'text' } },
  {
    accessor: 'department.name',
    title: 'Department',
    width: 180,
    filter: { type: 'select', options: countBy(({ department }) => department.name) },
  },
  {
    accessor: 'department.company.name',
    title: 'Company',
    width: 200,
    filter: { type: 'select', options: countBy(({ department }) => department.company.name) },
  },
  {
    accessor: 'sex',
    width: 140,
    render: ({ sex }) => (sex === 'male' ? 'Male' : 'Female'),
    filter: {
      type: 'select',
      allowCustomValues: false,
      options: [
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
      ],
    },
  },
  {
    accessor: 'birthDate',
    width: 190,
    render: ({ birthDate }) => dayjs(birthDate).format('MMM D, YYYY'),
    filter: { type: 'date' },
  },
  {
    accessor: 'age',
    width: 130,
    textAlign: 'right',
    render: ({ birthDate }) => dayjs().diff(birthDate, 'years'),
    filter: { type: 'number', getValue: ({ birthDate }) => dayjs().diff(birthDate, 'years') },
  },
];

const LOCKED_FILTERS: DataTableFilters = {
  'department.company.name': [{ operator: 'equals', value: companies[0].name }],
};

export function ColumnFiltersExample() {
  const [display, setDisplay] = useState<'popover' | 'row'>('popover');
  const [withChips, setWithChips] = useState(true);
  const [highlight, setHighlight] = useState(true);
  const [locked, setLocked] = useState(false);
  const [page, setPage] = useState(1);

  // Persisted in localStorage, so filters survive a page reload
  const { filters, setFilters } = useDataTableFilters({ key: 'column-filters-example' });
  const lockedFilters = locked ? LOCKED_FILTERS : undefined;

  const matching = filterRecords(employees, { columns, filters, lockedFilters });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(matching.length / PAGE_SIZE)));
  const records = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Stack>
      <Group>
        <SegmentedControl
          size="xs"
          value={display}
          onChange={(value) => setDisplay(value as 'popover' | 'row')}
          data={[
            { value: 'popover', label: 'Popover' },
            { value: 'row', label: 'Filter row' },
          ]}
        />
        <Switch label="Filter chips" checked={withChips} onChange={(e) => setWithChips(e.currentTarget.checked)} />
        <Switch label="Highlight matches" checked={highlight} onChange={(e) => setHighlight(e.currentTarget.checked)} />
        <Switch label="Locked company filter" checked={locked} onChange={(e) => setLocked(e.currentTarget.checked)} />
      </Group>
      <DataTable
        height={520}
        withTableBorder
        withColumnBorders
        striped
        columns={columns}
        records={records}
        filters={filters}
        onFiltersChange={setFilters}
        lockedFilters={lockedFilters}
        filterDisplay={display}
        withFilterChips={withChips}
        highlightFilterMatches={highlight}
        page={currentPage}
        onPageChange={setPage}
        totalRecords={matching.length}
        recordsPerPage={PAGE_SIZE}
      />
      <Code block>{JSON.stringify(filters, null, 2)}</Code>
    </Stack>
  );
}
