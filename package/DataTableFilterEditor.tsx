import { Button, Group, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRef } from 'react';
import { DataTableFilterInput, type DataTableFilterInputApi } from './DataTableFilterInput';
import { DataTableFilterEditorContext, useDataTableFiltersContext } from './DataTableFilters.context';
import type { DataTableResolvedFilter } from './filters/config';
import type { DataTableFilterCondition, DataTableFilterEditorRenderProps } from './types';

export const FILTER_POPOVER_WIDTH = 360;

type DataTableFilterEditorProps = {
  filter: DataTableResolvedFilter;
  close: () => void;
};

export function DataTableFilterEditor({ filter, close }: DataTableFilterEditorProps) {
  const { filters, lockedFilters, setColumnConditions, texts } = useDataTableFiltersContext();
  const [helpOpened, { toggle: toggleHelp }] = useDisclosure(false);
  const inputApi = useRef<DataTableFilterInputApi>(null);
  const conditions = filters[filter.key] ?? [];
  const lockedConditions = lockedFilters?.[filter.key];
  const setConditions = (next: DataTableFilterCondition[]) => setColumnConditions(filter.key, next);
  const hasPicker = filter.type === 'date' && !!filter.renderPicker;
  const renderProps: DataTableFilterEditorRenderProps = {
    conditions,
    setConditions,
    addCondition: (condition) => setColumnConditions(filter.key, (current) => [...current, condition]),
    close,
  };

  return (
    <div
      className="mantine-datatable-filter-editor"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) close();
      }}
      // Clicking buttons, help examples or calendar days keeps focus in the input, so its blur doesn't
      // commit half-typed text first. Other inputs (e.g. a picker's time inputs) still take focus.
      onMouseDown={(event) => {
        if (!(event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) {
          event.preventDefault();
        }
      }}
    >
      <DataTableFilterEditorContext value={filter}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size="sm" fw={600} truncate>
            {filter.label}
          </Text>
          <Group gap={4} wrap="nowrap">
            {filter.type === 'custom' ? null : (
              <Button
                variant={helpOpened ? 'light' : 'subtle'}
                size="compact-xs"
                aria-pressed={helpOpened}
                onClick={toggleHelp}
              >
                {texts.syntax}
              </Button>
            )}
            <Button
              variant="subtle"
              color="gray"
              size="compact-xs"
              disabled={!conditions.length}
              onClick={() => setConditions([])}
            >
              {texts.clear}
            </Button>
          </Group>
        </Group>
        {filter.type === 'custom' ? (
          filter.render(renderProps)
        ) : (
          <>
            <DataTableFilterInput
              apiRef={inputApi}
              filter={filter}
              conditions={conditions}
              lockedConditions={lockedConditions}
              onChange={setConditions}
              size="sm"
              variant="popover"
              withinPortal={false}
              autoFocus
              openOnFocus={!hasPicker && !helpOpened}
            />
            {helpOpened ? (
              <div className="mantine-datatable-filter-help">
                <div className="mantine-datatable-filter-help-grid">
                  {texts.help[filter.type].map(([example, description]) => (
                    <div key={example} className="mantine-datatable-filter-help-row">
                      <UnstyledButton
                        className="mantine-datatable-filter-help-example"
                        onClick={() => inputApi.current?.setText(example)}
                      >
                        {example}
                      </UnstyledButton>
                      <span className="mantine-datatable-filter-help-description">{description}</span>
                    </div>
                  ))}
                </div>
                <Text size="xs" c="dimmed">
                  {texts.helpHint}
                </Text>
              </div>
            ) : filter.type === 'date' && filter.renderPicker ? (
              filter.renderPicker(renderProps)
            ) : null}
          </>
        )}
      </DataTableFilterEditorContext>
    </div>
  );
}
