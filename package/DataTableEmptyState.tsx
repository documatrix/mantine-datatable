import { Center, Text } from '@mantine/core';
import { IconDatabaseOff } from './icons/IconDatabaseOff';

type DataTableEmptyStateProps = React.PropsWithChildren<{
  icon: React.ReactNode | undefined;
  text: string;
  active: boolean;
  action?: React.ReactNode;
}>;

export function DataTableEmptyState({ icon, text, active, action, children }: DataTableEmptyStateProps) {
  return (
    <Center className="mantine-datatable-empty-state" data-active={active || undefined}>
      {children || (
        <>
          {icon || (
            <div className="mantine-datatable-empty-state-icon">
              <IconDatabaseOff />
            </div>
          )}
          <Text component="div" size="sm" c="dimmed">
            {text}
          </Text>
          {action ? <div className="mantine-datatable-empty-state-action">{action}</div> : null}
        </>
      )}
    </Center>
  );
}
