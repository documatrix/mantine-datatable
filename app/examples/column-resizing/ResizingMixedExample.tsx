'use client';

import { DataTable, useDataTableColumns } from '__PACKAGE__';
import { Button, Group, Stack } from '@mantine/core';
import { type Company, companies } from '~/data';

export default function ResizingMixedExample() {
  const key = 'resize-mixed-example';

  const { effectiveColumns, resetColumnsWidth } = useDataTableColumns<Company>({
    key,
    columns: [
      { accessor: 'name', resizable: true, width: 200 },
      { accessor: 'city', resizable: true, ellipsis: true },
      { accessor: 'state' },
      { accessor: 'missionStatement' },
    ],
  });

  return (
    <Stack>
      <DataTable
        withTableBorder
        withColumnBorders
        storeColumnsKey={key}
        records={companies}
        columns={effectiveColumns}
      />
      <Group justify="right">
        <Button onClick={resetColumnsWidth}>Reset Column Width</Button>
      </Group>
    </Stack>
  );
}
