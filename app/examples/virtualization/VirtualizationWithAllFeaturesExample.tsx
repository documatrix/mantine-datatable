'use client';

import { DataTable, type DataTableSortStatus } from '__PACKAGE__';
import { Box, Button, Group, Text } from '@mantine/core';
import type { Virtualizer } from '@tanstack/react-virtual';
import sortBy from 'lodash/sortBy';
import { useMemo, useRef, useState } from 'react';
import { type Employee, employees } from '~/data';

// Repeat the sample employees to obtain a large dataset
const allRecords: Employee[] = Array.from({ length: 5000 }, (_, index) => {
  const employee = employees[index % employees.length];
  return { ...employee, id: `${employee.id}-${index}` };
});

export function VirtualizationWithAllFeaturesExample() {
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Employee>>({
    columnAccessor: 'firstName',
    direction: 'asc',
  });
  const [selectedRecords, setSelectedRecords] = useState<Employee[]>([]);
  const virtualizerRef = useRef<Virtualizer<HTMLElement, HTMLTableRowElement> | null>(null);

  const records = useMemo(() => {
    const data = sortBy(allRecords, sortStatus.columnAccessor) as Employee[];
    return sortStatus.direction === 'desc' ? data.reverse() : data;
  }, [sortStatus]);

  const lastVisitedSelectedIndex = useRef(-1);

  const jumpToNextSelectedRow = () => {
    const selectedIds = new Set(selectedRecords.map(({ id }) => id));
    const selectedIndexes = records.reduce<number[]>((acc, record, index) => {
      if (selectedIds.has(record.id)) acc.push(index);
      return acc;
    }, []);
    if (selectedIndexes.length === 0) return;
    // Jump to the first selected row below the last visited one, wrapping around
    const nextIndex = selectedIndexes.find((index) => index > lastVisitedSelectedIndex.current) ?? selectedIndexes[0];
    lastVisitedSelectedIndex.current = nextIndex;
    virtualizerRef.current?.scrollToIndex(nextIndex, { align: 'center' });
  };

  return (
    <>
      <DataTable
        withTableBorder
        borderRadius="sm"
        striped
        highlightOnHover
        height={400}
        virtualized
        pinLastColumn
        records={records}
        columns={[
          { accessor: 'firstName', sortable: true },
          { accessor: 'lastName', sortable: true },
          { accessor: 'email', sortable: true },
          { accessor: 'department.name', title: 'Department' },
          { accessor: 'department.company.name', title: 'Company', noWrap: true },
        ]}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        virtualizerRef={virtualizerRef}
        rowExpansion={{
          content: ({ record }) => (
            <Box p="xs">
              <Text size="sm">
                {record.firstName} {record.lastName} works at {record.department.company.name}, {record.department.name}{' '}
                department, and can be reached at {record.email}.
              </Text>
            </Box>
          ),
        }}
      />
      <Group justify="space-between" mt="sm">
        <Text size="sm">
          {selectedRecords.length ? `${selectedRecords.length} selected records` : 'Click a row to expand it'}
        </Text>
        <Group>
          <Button variant="light" onClick={() => virtualizerRef.current?.scrollToIndex(0)}>
            Scroll to first row
          </Button>
          <Button variant="light" onClick={() => virtualizerRef.current?.scrollToIndex(2500, { align: 'center' })}>
            Scroll to row 2,500
          </Button>
          <Button variant="light" disabled={selectedRecords.length === 0} onClick={jumpToNextSelectedRow}>
            Jump to next selected row
          </Button>
        </Group>
      </Group>
    </>
  );
}
