import { useDirection } from '@mantine/core';
import type { RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useDataTableColumnsContext } from './DataTableColumns.context';
import { columnWidthVar } from './utils';

type DataTableResizableHeaderHandleProps = {
  accessor: string;
  columnRef: RefObject<HTMLTableCellElement | null>;
  /** Only move a guide line while dragging and apply the width on drop. */
  deferred: boolean;
};

type ResizeGuide = { x: number; top: number; height: number };

const MIN_COLUMN_WIDTH = 50;

export const DataTableResizableHeaderHandle = (props: DataTableResizableHeaderHandleProps) => {
  const { accessor, columnRef, deferred } = props;
  const [isResizing, setIsResizing] = useState(false);
  const [guide, setGuide] = useState<ResizeGuide | null>(null);
  const startXRef = useRef<number>(0);
  const originalWidthsRef = useRef<{ current: number; next: number }>({ current: 0, next: 0 });

  const { dir } = useDirection();
  const isRTL = dir === 'rtl';

  const { setMultipleColumnWidths, beginResize, endResize } = useDataTableColumnsContext();

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (!columnRef.current) return;

      const currentColumn = columnRef.current;

      // Find the next resizable data column (skip selection column)
      let nextColumn = currentColumn.nextElementSibling as HTMLTableCellElement | null;
      while (nextColumn) {
        const nextAccessor = nextColumn.getAttribute('data-accessor');
        if (nextAccessor && nextAccessor !== '__selection__') {
          break;
        }
        nextColumn = nextColumn.nextElementSibling as HTMLTableCellElement | null;
      }

      if (!nextColumn) {
        return;
      }

      const nextAccessor = nextColumn.getAttribute('data-accessor');
      if (!nextAccessor) {
        return;
      }

      // Capture pixel widths BEFORE switching the table to fixed layout —
      // these are the natural rendered widths the user is starting from.
      const startCurrentWidth = currentColumn.offsetWidth;
      const startNextWidth = nextColumn.offsetWidth;

      // Snapshot every resizable header cell into pixel widths
      const resizable = beginResize();
      // A non-resizable neighbour keeps its declared width; the table layout absorbs the change.
      const tradesWithNext = resizable.has(nextAccessor);

      setIsResizing(true);
      startXRef.current = event.clientX;
      originalWidthsRef.current = {
        current: startCurrentWidth,
        next: startNextWidth,
      };

      const table = currentColumn.closest('table');
      const currentVar = columnWidthVar(accessor);
      const nextVar = columnWidthVar(nextAccessor);
      let liveWidths: { current: number; next: number } | null = null;
      const guideBounds = table?.closest('.mantine-datatable')?.getBoundingClientRect();

      // Live widths go to the DOM as CSS variables (see `columnWidthValue`); React only learns
      // the result on mouseup, so rows don't re-render on every mousemove. Deferred columns
      // only move the guide line until then.
      const handleMouseMove = (moveEvent: MouseEvent) => {
        let deltaX = moveEvent.clientX - startXRef.current;
        if (isRTL) deltaX = -deltaX;

        const maxShrinkCurrent = originalWidthsRef.current.current - MIN_COLUMN_WIDTH;
        const maxShrinkNext = tradesWithNext ? originalWidthsRef.current.next - MIN_COLUMN_WIDTH : Infinity;

        const constrainedDelta = Math.max(-maxShrinkCurrent, Math.min(deltaX, maxShrinkNext));

        liveWidths = {
          current: originalWidthsRef.current.current + constrainedDelta,
          next: originalWidthsRef.current.next - constrainedDelta,
        };
        if (deferred) {
          setGuide({
            x: startXRef.current + (isRTL ? -constrainedDelta : constrainedDelta),
            top: guideBounds?.top ?? 0,
            height: guideBounds?.height ?? 0,
          });
          return;
        }
        table?.style.setProperty(currentVar, `${liveWidths.current}px`);
        if (tradesWithNext) table?.style.setProperty(nextVar, `${liveWidths.next}px`);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        setGuide(null);

        document.body.style.cursor = 'initial';
        document.body.style.userSelect = 'initial';

        // Commit synchronously so the fallback widths already match when the variables go away.
        flushSync(() => {
          if (liveWidths) {
            setMultipleColumnWidths([
              { accessor, width: `${liveWidths.current}px` },
              ...(tradesWithNext ? [{ accessor: nextAccessor, width: `${liveWidths.next}px` }] : []),
            ]);
          }
          endResize();
        });
        table?.style.removeProperty(currentVar);
        table?.style.removeProperty(nextVar);

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [accessor, columnRef, deferred, isRTL, setMultipleColumnWidths, beginResize, endResize]
  );

  const handleDoubleClick = useCallback(() => {
    if (!columnRef.current) return;

    const currentColumn = columnRef.current;
    const nextColumn = currentColumn.nextElementSibling as HTMLTableCellElement | null;

    const updates = [{ accessor, width: 'auto' }];

    if (nextColumn) {
      const nextAccessor = nextColumn.getAttribute('data-accessor');
      if (nextAccessor && nextAccessor !== '__selection__') {
        updates.push({ accessor: nextAccessor, width: 'auto' });
      }
    }

    setMultipleColumnWidths(updates);
  }, [accessor, columnRef, setMultipleColumnWidths]);

  return (
    <>
      {guide &&
        createPortal(
          <div
            className="mantine-datatable-resize-guide"
            style={{ left: guide.x, top: guide.top, height: guide.height }}
          />,
          document.body
        )}
      <div
        className="mantine-datatable-header-resizable-handle"
        style={{
          cursor: isResizing ? 'col-resize' : undefined,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onClick={(event) => event.stopPropagation()} // Prevent column sorting
        title="Drag to resize column, double-click to reset"
      />
    </>
  );
};
