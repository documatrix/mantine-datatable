import type { DataTableColumn, DataTableFilterOption } from '__PACKAGE__';
import { Chip, Group } from '@mantine/core';
import dayjs from 'dayjs';
import { type EmployeeRecord, loadDepartmentOptions, records } from './api';

const age = ({ birthDate }: EmployeeRecord) => dayjs().diff(birthDate, 'years');

const AGE_GROUPS = [
  { value: 'under-30', label: 'Under 30', matches: (years: number) => years < 30 },
  { value: '30-50', label: '30–50', matches: (years: number) => years >= 30 && years <= 50 },
  { value: 'over-50', label: 'Over 50', matches: (years: number) => years > 50 },
];

function countBy(getValue: (record: EmployeeRecord) => string): DataTableFilterOption[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = getValue(record);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => ({ value, label: value, count }));
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export const columns: DataTableColumn<EmployeeRecord>[] = [
  // text
  {
    accessor: 'name',
    width: 190,
    render: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    filter: { type: 'text', getValue: ({ firstName, lastName }) => `${firstName} ${lastName}` },
  },
  { accessor: 'email', width: 260, filter: { type: 'text' } },
  // select with options loaded while typing
  {
    accessor: 'department.name',
    title: 'Department',
    width: 170,
    filter: { type: 'select', loadOptions: loadDepartmentOptions, optionsLimit: 8 },
  },
  // select with static options and counts
  {
    accessor: 'department.company.name',
    title: 'Company',
    width: 210,
    filter: { type: 'select', options: countBy(({ department }) => department.company.name) },
  },
  // select that only accepts its options
  {
    accessor: 'sex',
    width: 130,
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
  // date with calendar
  {
    accessor: 'birthDate',
    width: 170,
    render: ({ birthDate }) => dayjs(birthDate).format('MMM D, YYYY'),
    filter: { type: 'date' },
  },
  // number
  {
    accessor: 'age',
    width: 110,
    textAlign: 'right',
    render: age,
    filter: { type: 'number', getValue: age },
  },
  // custom editor
  {
    accessor: 'ageGroup',
    title: 'Age group',
    width: 150,
    render: (record) => AGE_GROUPS.find(({ matches }) => matches(age(record)))?.label,
    filter: {
      type: 'custom',
      render: ({ conditions, setConditions }) => (
        <Chip.Group
          multiple
          value={conditions.map(({ value }) => String(value))}
          onChange={(values) => setConditions(values.map((value) => ({ operator: 'equals', value })))}
        >
          <Group gap="xs">
            {AGE_GROUPS.map(({ value, label }) => (
              <Chip key={value} value={value} size="xs">
                {label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      ),
      format: ({ value }) => AGE_GROUPS.find((group) => group.value === value)?.label ?? String(value),
      match: (record, conditions) =>
        conditions.some(({ value }) => AGE_GROUPS.find((group) => group.value === value)?.matches(age(record))),
    },
  },
  // boolean
  {
    accessor: 'senior',
    width: 110,
    render: (record) => (age(record) >= 60 ? 'Yes' : 'No'),
    filter: { type: 'boolean', getValue: (record) => age(record) >= 60 },
  },
  // duration, stored in seconds
  {
    accessor: 'responseTime',
    title: 'Avg. response',
    width: 150,
    textAlign: 'right',
    render: ({ responseTime }) => formatDuration(responseTime),
    filter: { type: 'duration', unit: 's' },
  },
  // date with time
  {
    accessor: 'lastLogin',
    width: 190,
    render: ({ lastLogin }) => dayjs(lastLogin).format('MMM D, HH:mm'),
    filter: { type: 'date', withTime: true },
  },
];
