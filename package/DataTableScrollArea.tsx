import { Box } from '@mantine/core';
import clsx from 'clsx';

type DataTableScrollAreaProps = React.PropsWithChildren<{
  leftShadowBehind: boolean;
  rightShadowBehind: boolean | undefined;
  onScroll: React.UIEventHandler<HTMLDivElement>;
  viewportRef: React.Ref<HTMLDivElement>;
  scrollAreaProps: React.HTMLAttributes<HTMLDivElement> | undefined;
}>;

export function DataTableScrollArea({
  leftShadowBehind,
  rightShadowBehind,
  onScroll,
  children,
  viewportRef,
  scrollAreaProps,
}: DataTableScrollAreaProps) {
  return (
    <div
      {...scrollAreaProps}
      ref={viewportRef}
      onScroll={onScroll}
      className={clsx('mantine-datatable-scroll-area', scrollAreaProps?.className)}
      style={{
        overflow: 'auto',
        position: 'relative',
        flex: '1 1 100%',
        ...scrollAreaProps?.style,
      }}
    >
      {children}
      <Box className={clsx('mantine-datatable-scroll-area-shadow', 'mantine-datatable-scroll-area-top-shadow')} />
      <div
        className={clsx('mantine-datatable-scroll-area-shadow', 'mantine-datatable-scroll-area-left-shadow', {
          'mantine-datatable-scroll-area-shadow-behind': leftShadowBehind,
        })}
      />
      <div
        className={clsx('mantine-datatable-scroll-area-shadow', 'mantine-datatable-scroll-area-right-shadow', {
          'mantine-datatable-scroll-area-shadow-behind': rightShadowBehind,
        })}
      />
      <Box className={clsx('mantine-datatable-scroll-area-shadow', 'mantine-datatable-scroll-area-bottom-shadow')} />
    </div>
  );
}
