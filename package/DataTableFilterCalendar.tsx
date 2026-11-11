import { Button, Group } from '@mantine/core';
import { DatePicker, TimeInput } from '@mantine/dates';
import { useState } from 'react';
import { useDataTableFilterEditorContext, useDataTableFiltersContext } from './DataTableFilters.context';
import { resolveDatePeriod, toDayToken } from './filters/dates';
import { getDateConditionRange } from './filters/match';
import type { DataTableFilterEditorRenderProps } from './types';

export type DataTableFilterCalendarProps = Pick<DataTableFilterEditorRenderProps, 'conditions' | 'addCondition'>;

/**
 * Calendar for date filters, built on `@mantine/dates`. Picks a day (click it twice) or a range, with start and
 * end times when the filter sets `withTime`. Use it as a date filter's picker:
 *
 * ```tsx
 * filter: { type: 'date', renderPicker: (props) => <DataTableFilterCalendar {...props} /> }
 * ```
 */
export function DataTableFilterCalendar({ conditions, addCondition: onAdd }: DataTableFilterCalendarProps) {
  const { texts } = useDataTableFiltersContext();
  const filter = useDataTableFilterEditorContext();
  const [range, setRange] = useState<[string | null, string | null]>([null, null]);
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const weekStartsOn = filter.type === 'date' ? (filter.weekStartsOn ?? 1) : 1;
  const withTime = filter.type === 'date' && filter.withTime;

  const now = new Date();
  const matchedRanges = conditions
    .filter((condition) => !condition.negate && condition.operator !== 'empty')
    .map((condition) => getDateConditionRange(condition, now, weekStartsOn))
    .filter((range) => range !== null);
  const isMatched = (date: string) => {
    const day = resolveDatePeriod(date, now, weekStartsOn);
    return (
      !!day &&
      matchedRanges.some(
        ([from, to]) => (from !== null || to !== null) && (!from || from < day.end) && (!to || to >= day.start)
      )
    );
  };
  const firstMatch = matchedRanges.find(([from, to]) => from ?? to);
  const initialMonth = toDayToken(firstMatch?.[0] ?? firstMatch?.[1] ?? now);

  const add = (from: string, to: string) => {
    const token = (date: string, time: string) => (time ? `${date}T${time}` : date);
    onAdd(
      from === to && !fromTime && !toTime
        ? { operator: 'equals', value: from }
        : { operator: 'between', value: [token(from, fromTime), token(to, toTime)] }
    );
    setRange([null, null]);
    setFromTime('');
    setToTime('');
  };

  return (
    <div className="mantine-datatable-filter-calendar">
      <DatePicker
        type="range"
        allowSingleDateInRange
        size="sm"
        value={range}
        defaultDate={initialMonth}
        firstDayOfWeek={weekStartsOn}
        onChange={(value) => {
          setRange(value);
          if (!withTime && value[0] && value[1]) add(value[0], value[1]);
        }}
        getDayProps={(date) => (isMatched(date) ? { 'data-filter-match': true } : {})}
      />
      {withTime ? (
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <TimeInput
            size="xs"
            label={texts.fromTime}
            value={fromTime}
            onChange={(event) => setFromTime(event.currentTarget.value)}
          />
          <TimeInput
            size="xs"
            label={texts.toTime}
            value={toTime}
            onChange={(event) => setToTime(event.currentTarget.value)}
          />
          <Button size="xs" disabled={!range[0]} onClick={() => range[0] && add(range[0], range[1] ?? range[0])}>
            {texts.addRange}
          </Button>
        </Group>
      ) : null}
    </div>
  );
}
