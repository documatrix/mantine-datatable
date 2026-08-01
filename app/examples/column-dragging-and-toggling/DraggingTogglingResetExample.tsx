'use client';

import { DataTable, useDataTableColumns } from '__PACKAGE__';
import { Button, Group } from '@mantine/core';
import { IconColumnRemove, IconColumns3 } from '@tabler/icons-react';
import { companies } from '~/data';

export default function DraggingTogglingResetExample() {
  const key = 'toggleable-reset-example';

  const { effectiveColumns, resetColumnsOrder, resetColumnsToggle } = useDataTableColumns({
    key,
    columns: [
      { accessor: 'name', width: '40%', toggleable: true, draggable: true },
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
        records={companies}
        columns={effectiveColumns}
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
