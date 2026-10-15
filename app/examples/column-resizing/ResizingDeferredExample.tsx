'use client';

import { DataTable, useDataTableColumns } from '__PACKAGE__';
import { Badge, Button, Group, OverflowList, Stack } from '@mantine/core';
import { type Company, companies } from '~/data';

const KEY = 'resize-deferred-example';

export default function ResizingDeferredExample() {
  const { effectiveColumns, resetColumnsWidth } = useDataTableColumns<Company>({
    key: KEY,
    columns: [
      { accessor: 'name', resizable: true, width: 200 },
      {
        accessor: 'missionStatement',
        title: 'Keywords',
        resizable: true,
        // The cell measures itself on every width change, so the width is applied on drop.
        deferredResize: true,
        width: 320,
        render: ({ missionStatement }) => (
          <OverflowList
            data={missionStatement.split(' ')}
            maxRows={1}
            renderItem={(word) => (
              <Badge variant="light" size="sm">
                {word}
              </Badge>
            )}
            renderOverflow={(rest) => (
              <Badge variant="outline" size="sm">
                +{rest.length}
              </Badge>
            )}
          />
        ),
      },
      { accessor: 'city', resizable: true, ellipsis: true },
      { accessor: 'state', ellipsis: true },
    ],
  });

  return (
    <Stack>
      <DataTable
        withTableBorder
        withColumnBorders
        storeColumnsKey={KEY}
        records={companies}
        columns={effectiveColumns}
      />
      <Group justify="right">
        <Button onClick={resetColumnsWidth}>Reset Column Width</Button>
      </Group>
    </Stack>
  );
}
