'use client';

import { DataTable, type DataTableFilters, filterRecords, resolveFilters, useDataTableFilters } from '__PACKAGE__';
import { Code, Group, SegmentedControl, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { useState } from 'react';
import { companies } from '~/data';
import { records } from './api';
import { columns } from './columns';

const PAGE_SIZE = 15;

const LOCKED_FILTERS: DataTableFilters = {
  'department.company.name': [{ operator: 'equals', value: companies[0].name }],
};

export function ColumnFiltersExample() {
  const [display, setDisplay] = useState<'popover' | 'row'>('popover');
  const [withChips, setWithChips] = useState(true);
  const [highlight, setHighlight] = useState(true);
  const [locked, setLocked] = useState(false);
  const [page, setPage] = useState(1);
  // Ages and login times depend on the current time, so rows are only rendered in the browser
  const mounted = useMounted();

  // Persisted in localStorage, so filters survive a page reload
  const { filters, setFilters } = useDataTableFilters({ key: 'column-filters-example' });
  const lockedFilters = locked ? LOCKED_FILTERS : undefined;

  // In the browser: filter the records directly
  const matching = filterRecords(records, { columns, filters, lockedFilters });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(matching.length / PAGE_SIZE)));

  // With a server: send this instead, the server applies its locked filters itself
  const request = resolveFilters(filters, { columns });

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
        height={560}
        withTableBorder
        withColumnBorders
        striped
        pinFirstColumn
        columns={columns}
        records={mounted ? matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : []}
        fetching={!mounted}
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
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Stored filters
          </Text>
          <Code block>{JSON.stringify(filters, null, 2)}</Code>
        </Stack>
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Sent to a server (<Code>resolveFilters</Code>)
          </Text>
          <Code block>{JSON.stringify(request, null, 2)}</Code>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
