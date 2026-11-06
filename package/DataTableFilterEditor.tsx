import { Button, Code, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DataTableFilterCalendar } from './DataTableFilterCalendar';
import { DataTableFilterInput } from './DataTableFilterInput';
import { useDataTableFiltersContext } from './DataTableFilters.context';
import type { DataTableResolvedFilter } from './filters/config';
import type { DataTableFilterCondition, DataTableFilterEditorRenderProps } from './types';

type DataTableFilterEditorProps = {
  filter: DataTableResolvedFilter;
  close: () => void;
};

export function DataTableFilterEditor({ filter, close }: DataTableFilterEditorProps) {
  const { filters, lockedFilters, setColumnConditions, texts } = useDataTableFiltersContext();
  const [helpOpened, { toggle: toggleHelp }] = useDisclosure(false);
  const conditions = filters[filter.key] ?? [];
  const lockedConditions = lockedFilters?.[filter.key];
  const setConditions = (next: DataTableFilterCondition[]) => setColumnConditions(filter.key, next);
  const showCalendar = filter.type === 'date' && !filter.renderPicker && filter.withCalendar !== false;
  const renderProps: DataTableFilterEditorRenderProps = {
    conditions,
    setConditions,
    addCondition: (condition) => setConditions([...conditions, condition]),
    close,
  };

  return (
    <div
      className="mantine-datatable-filter-editor"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) close();
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="sm" fw={600} truncate>
          {filter.label}
        </Text>
        <Group gap={4} wrap="nowrap">
          {filter.type === 'custom' ? null : (
            <Button variant={helpOpened ? 'light' : 'subtle'} size="compact-xs" onClick={toggleHelp}>
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
            filter={filter}
            conditions={conditions}
            lockedConditions={lockedConditions}
            onChange={setConditions}
            size="sm"
            variant="popover"
            withinPortal={false}
            autoFocus
            openOnFocus={!showCalendar}
          />
          {filter.type === 'date' ? (
            filter.renderPicker ? (
              filter.renderPicker(renderProps)
            ) : showCalendar ? (
              <DataTableFilterCalendar filter={filter} conditions={conditions} onAdd={renderProps.addCondition} />
            ) : null
          ) : null}
          {helpOpened ? (
            <table className="mantine-datatable-filter-help">
              <tbody>
                {texts.help[filter.type].map(([examples, description]) => (
                  <tr key={examples}>
                    <td>
                      {examples.split(/\s{2,}/).map((example) => (
                        <Code key={example}>{example}</Code>
                      ))}
                    </td>
                    <td>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </div>
  );
}
