import {
  Button,
  CloseButton,
  Popover,
  PopoverDropdown,
  PopoverTarget,
  TableTh,
  TableTr,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DataTableFilterEditor, FILTER_POPOVER_WIDTH } from './DataTableFilterEditor';
import { useDataTableFiltersContext } from './DataTableFilters.context';
import { type DataTableResolvedFilter, getFallbackFilter, resolveColumnFilters } from './filters/config';
import { formatFilterCondition } from './filters/format';
import { IconLock } from './icons/IconLock';
import type { DataTableColumn, DataTableFilterCondition } from './types';

type DataTableFilterChipsProps<T> = {
  columns: DataTableColumn<T>[];
  colSpan: number;
};

export function DataTableFilterChips<T>({ columns, colSpan }: DataTableFilterChipsProps<T>) {
  const { filters, lockedFilters, clearFilters, texts } = useDataTableFiltersContext();
  const configs = resolveColumnFilters(columns);
  const keys = [...configs.keys()];
  for (const key of [...Object.keys(lockedFilters ?? {}), ...Object.keys(filters)]) {
    if (!keys.includes(key)) keys.push(key);
  }
  const active = keys.filter((key) => lockedFilters?.[key]?.length || filters[key]?.length);
  if (!active.length) return null;
  const hasUserFilters = active.some((key) => filters[key]?.length);

  return (
    <TableTr className="mantine-datatable-filter-chips-row" onContextMenu={(event) => event.stopPropagation()}>
      <TableTh colSpan={colSpan} className="mantine-datatable-filter-chips-cell">
        <div className="mantine-datatable-filter-chips">
          {active.map((key) => (
            <DataTableFilterChip
              key={key}
              filter={(configs.get(key) as DataTableResolvedFilter | undefined) ?? getFallbackFilter(key)}
              editable={configs.has(key)}
              conditions={filters[key] ?? []}
              lockedConditions={lockedFilters?.[key] ?? []}
            />
          ))}
          {hasUserFilters ? (
            <Button variant="subtle" color="gray" size="compact-xs" onClick={clearFilters}>
              {texts.clearAll}
            </Button>
          ) : null}
        </div>
      </TableTh>
    </TableTr>
  );
}

type DataTableFilterChipProps = {
  filter: DataTableResolvedFilter;
  editable: boolean;
  conditions: DataTableFilterCondition[];
  lockedConditions: DataTableFilterCondition[];
};

function DataTableFilterChip({ filter, editable, conditions, lockedConditions }: DataTableFilterChipProps) {
  const { setColumnConditions, texts, locale, knownOptions } = useDataTableFiltersContext();
  const [opened, { close, toggle }] = useDisclosure(false);
  const options =
    filter.type === 'select' ? [...(filter.options ?? []), ...(knownOptions[filter.key] ?? [])] : undefined;
  const describe = (condition: DataTableFilterCondition) =>
    formatFilterCondition(condition, filter, { texts, locale, options });
  const locked = conditions.length === 0;

  const content = (
    <>
      <span className="mantine-datatable-filter-chip-label">{filter.label}</span>
      {lockedConditions.map((condition, i) => (
        <span key={`locked-${i}`} className="mantine-datatable-filter-chip-condition" data-locked title={texts.locked}>
          <IconLock />
          {describe(condition)}
        </span>
      ))}
      {conditions.map((condition, i) => (
        <span key={i} className="mantine-datatable-filter-chip-condition" data-negate={condition.negate || undefined}>
          {describe(condition)}
        </span>
      ))}
    </>
  );

  return (
    <div className="mantine-datatable-filter-chip" data-locked={locked || undefined}>
      {editable ? (
        <Popover
          opened={opened}
          onClose={close}
          onDismiss={close}
          trapFocus
          withArrow
          shadow="md"
          width={FILTER_POPOVER_WIDTH}
          position="bottom-start"
          closeOnEscape={false}
        >
          <PopoverTarget>
            <UnstyledButton
              className="mantine-datatable-filter-chip-button"
              aria-label={texts.editFilter(filter.label)}
              onClick={toggle}
            >
              {content}
            </UnstyledButton>
          </PopoverTarget>
          <PopoverDropdown onKeyDown={(event) => event.stopPropagation()}>
            <DataTableFilterEditor filter={filter} close={close} />
          </PopoverDropdown>
        </Popover>
      ) : (
        <span className="mantine-datatable-filter-chip-button">{content}</span>
      )}
      {conditions.length ? (
        <CloseButton
          size="xs"
          className="mantine-datatable-filter-chip-remove"
          aria-label={texts.removeCondition(filter.label)}
          onClick={() => setColumnConditions(filter.key, [])}
        />
      ) : null}
    </div>
  );
}
