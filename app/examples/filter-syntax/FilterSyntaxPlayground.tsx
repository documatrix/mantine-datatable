'use client';

import {
  conditionToText,
  type DataTableColumnFilter,
  type DataTableFilterType,
  DEFAULT_FILTER_TEXTS,
  formatFilterCondition,
  parseFilterInput,
  resolveColumnFilter,
  resolveFilters,
  toSqlLikePattern,
} from '__PACKAGE__';
import { Code, Group, Pill, SegmentedControl, Stack, Table, Text, TextInput } from '@mantine/core';
import { useState } from 'react';

type PlaygroundType = Exclude<DataTableFilterType, 'custom'>;

const FILTERS: Record<PlaygroundType, DataTableColumnFilter> = {
  text: { type: 'text' },
  number: { type: 'number' },
  duration: { type: 'duration' },
  date: { type: 'date' },
  boolean: { type: 'boolean' },
  select: {
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'done', label: 'Done' },
      { value: null, label: 'No status' },
    ],
  },
};

const EXAMPLES: Record<PlaygroundType, string> = {
  text: 'Ann*, *son, !"a, b", =',
  number: '>=18, !30..40',
  duration: '1h30m.., <90s',
  date: '-6d..today, >2026-03, 05.03.2026',
  boolean: 'yes, =',
  select: 'open, !Done, No status',
};

export function FilterSyntaxPlayground() {
  const [type, setType] = useState<PlaygroundType>('text');
  const [input, setInput] = useState(EXAMPLES.text);

  const filter = resolveColumnFilter({ accessor: 'value', filter: FILTERS[type] })!;
  const options = filter.type === 'select' ? filter.options : undefined;
  const context = { texts: DEFAULT_FILTER_TEXTS, options };
  const { conditions, error } = parseFilterInput(input, filter, context);
  const resolved = resolveFilters({ value: conditions }, { columns: [{ accessor: 'value', filter: FILTERS[type] }] });

  return (
    <Stack>
      <SegmentedControl
        value={type}
        onChange={(value) => {
          setType(value as PlaygroundType);
          setInput(EXAMPLES[value as PlaygroundType]);
        }}
        data={Object.keys(FILTERS)}
      />
      <TextInput
        label="Filter input"
        value={input}
        onChange={(event) => setInput(event.currentTarget.value)}
        error={error}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
      />
      <Group gap={6}>
        {conditions.map((condition, i) => (
          <Pill key={i}>{formatFilterCondition(condition, filter, context)}</Pill>
        ))}
      </Group>
      <Table withTableBorder withColumnBorders fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Condition</Table.Th>
            <Table.Th>Typed back as</Table.Th>
            <Table.Th>Sent to a server</Table.Th>
            <Table.Th>SQL LIKE</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {conditions.map((condition, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <Code>{JSON.stringify(condition)}</Code>
              </Table.Td>
              <Table.Td>
                <Code>{conditionToText(condition, filter, options)}</Code>
              </Table.Td>
              <Table.Td>
                <Code>{JSON.stringify(resolved.value?.[i] ?? condition)}</Code>
              </Table.Td>
              <Table.Td>{toSqlLikePattern(condition) ? <Code>{toSqlLikePattern(condition)}</Code> : '–'}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

export function FilterSyntaxReference({ type }: { type: PlaygroundType }) {
  return (
    <Table withTableBorder withColumnBorders fz="sm" layout="fixed">
      <Table.Tbody>
        {DEFAULT_FILTER_TEXTS.help[type].map(([examples, description]) => (
          <Table.Tr key={examples}>
            <Table.Td w="45%">
              <Group gap={6}>
                {examples.split(/\s{2,}/).map((example) => (
                  <Code key={example}>{example}</Code>
                ))}
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{description}</Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
