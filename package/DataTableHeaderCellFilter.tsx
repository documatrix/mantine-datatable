import { ActionIcon, Popover, PopoverDropdown, type PopoverProps, PopoverTarget } from '@mantine/core';
import { useClickOutside, useDisclosure } from '@mantine/hooks';
import type { RefObject } from 'react';
import { IconFilter } from './icons/IconFilter';
import { IconFilterFilled } from './icons/IconFilterFilled';

type DataTableHeaderCellFilterProps = {
  children: React.ReactNode | ((params: { close: () => void }) => React.ReactNode);
  filterPopoverProps: PopoverProps | undefined;
  filterPopoverDisableClickOutside?: boolean;
  isActive: boolean;
  count?: number;
  label?: string;
};

export function DataTableHeaderCellFilter({
  children,
  isActive,
  count,
  label,
  filterPopoverProps,
  filterPopoverDisableClickOutside,
}: DataTableHeaderCellFilterProps) {
  const [isOpen, { close, toggle }] = useDisclosure(false);
  const Icon = isActive ? IconFilterFilled : IconFilter;
  let ref: RefObject<HTMLDivElement | null> | undefined = useClickOutside(close);
  if (filterPopoverDisableClickOutside) ref = undefined;

  return (
    // Keep the expanded props before the open/close, or they could be overridden by the client
    <Popover withArrow shadow="md" trapFocus {...filterPopoverProps} opened={isOpen} onClose={close} onDismiss={close}>
      <PopoverTarget>
        <ActionIcon
          className="mantine-datatable-header-cell-filter-action-icon"
          data-active={isActive || undefined}
          size="sm"
          variant="default"
          aria-label={label}
          onClick={(e) => {
            e.preventDefault();
            toggle();
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Icon />
          {count && count > 1 ? <span className="mantine-datatable-header-cell-filter-count">{count}</span> : null}
        </ActionIcon>
      </PopoverTarget>
      <PopoverDropdown ref={ref} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {typeof children === 'function' ? children({ close }) : children}
      </PopoverDropdown>
    </Popover>
  );
}
