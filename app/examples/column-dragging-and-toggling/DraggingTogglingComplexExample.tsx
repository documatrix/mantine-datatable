'use client';

import { DataTable, type DataTableSortStatus, useDataTableColumns } from '__PACKAGE__';
import { Button, Group } from '@mantine/core';
import { IconColumnRemove, IconColumns3 } from '@tabler/icons-react';
import sortBy from 'lodash/sortBy';
import { useEffect, useState } from 'react';
import { type Company, companies } from '~/data';

export default function DraggingTogglingComplexExample() {
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Company>>({
    columnAccessor: 'name',
    direction: 'asc',
  });

  const [records, setRecords] = useState(sortBy(companies, 'name'));

  useEffect(() => {
    const data = sortBy(companies, sortStatus.columnAccessor) as Company[];
    setRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
  }, [sortStatus]);

  const key = 'toggleable-reset-example';

  const { effectiveColumns, resetColumnsOrder, resetColumnsToggle } = useDataTableColumns({
    key,
    columns: [
      { accessor: 'name', width: '40%', toggleable: true, draggable: true, sortable: true },
      { accessor: 'streetAddress', width: '60%', toggleable: true, draggable: true },
      { accessor: 'city', width: 160, toggleable: true, draggable: true },
      { accessor: 'state', textAlign: 'right' },
    ],
  });

  return (
    <>
      <DataTable
        withTableBorder
        withColumnBorders
        storeColumnsKey={key}
        records={records}
        columns={effectiveColumns}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
      />
      <Group mt="md" justify="center">
        <Button variant="default" leftSection={<IconColumnRemove size={16} />} onClick={resetColumnsToggle}>
          Reset toggled columns
        </Button>
        <Button variant="default" leftSection={<IconColumns3 size={16} />} onClick={resetColumnsOrder}>
          Reset columns order
        </Button>
      </Group>
    </>
  );
}
