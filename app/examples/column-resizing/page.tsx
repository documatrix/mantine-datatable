import { Code } from '@mantine/core';
import type { Route } from 'next';
import { PRODUCT_NAME } from '~/app/config';
import { CodeBlock } from '~/components/CodeBlock';
import { PageNavigation } from '~/components/PageNavigation';
import { PageSubtitle } from '~/components/PageSubtitle';
import { PageTitle } from '~/components/PageTitle';
import { Txt } from '~/components/Txt';
import { UnorderedList } from '~/components/UnorderedList';
import { readCodeFile } from '~/lib/code';
import { allPromiseProps, getRouteMetadata } from '~/lib/utils';
import ResizingComplexExample from './ResizingComplexExample';
import ResizingDeferredExample from './ResizingDeferredExample';
import ResizingExample from './ResizingExample';
import ResizingMixedExample from './ResizingMixedExample';

const PATH: Route = '/examples/column-resizing';

export const metadata = getRouteMetadata(PATH);

export default async function DraggingExamplePage() {
  const code = await allPromiseProps({
    'ResizingExample.tsx': readCodeFile<string>(`${PATH}/ResizingExample.tsx`),
    'ResizingComplexExample.tsx': readCodeFile<string>(`${PATH}/ResizingComplexExample.tsx`),
    'ResizingDeferredExample.tsx': readCodeFile<string>(`${PATH}/ResizingDeferredExample.tsx`),
    'ResizingMixedExample.tsx': readCodeFile<string>(`${PATH}/ResizingMixedExample.tsx`),
  });

  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        Starting with <Code>v7.3.1</Code>, {PRODUCT_NAME} supports column resizing.
      </Txt>
      <ResizingExample />
      <Txt>
        In order to enable <strong>column resizing</strong> you’ll have to:
      </Txt>
      <UnorderedList compact>
        <li>
          add a <Code>storeColumnsKey: your_key</Code> property to the DataTable (since the order of the columns is
          persisted in the local storage);
        </li>
        <li>
          add a <Code>resizable: true</Code> property to each <strong>resizing candidate</strong> column;
        </li>
        <li>
          use the <Code>useDataTableColumns()</Code> hook to get the effective columns.
        </li>
      </UnorderedList>
      <CodeBlock code={code['ResizingExample.tsx']} />
      <Txt idea>
        The default width of the columns is the <Code>width</Code> in which they are defined in the <Code>columns</Code>{' '}
        prop.
      </Txt>
      <Txt info>
        Of course, you can reset the column width to the default value by using the <Code>resetColumnsWidth()</Code>{' '}
        function.
        <br />
        You may also set up the column with to <Code>initial</Code> by double-clicking on the resize handle.
      </Txt>
      <PageSubtitle value="Mixing resizable and non-resizable columns" />
      <Txt>
        Only <strong>resizable</strong> columns get a stored pixel width. Columns without <Code>resizable: true</Code>{' '}
        keep the <Code>width</Code> they are defined with and take up the space the resized columns leave, so the table
        keeps filling its container when the viewport grows or shrinks. Dragging a handle next to a non-resizable column
        only changes the dragged column. Resize the <strong>Name</strong> or <strong>City</strong> column below, then
        change the window width:
      </Txt>
      <ResizingMixedExample />
      <CodeBlock code={code['ResizingMixedExample.tsx']} />
      <Txt info>
        When every visible column is resizable, the first drag locks all of them to pixel widths and the table is as
        wide as their sum.
      </Txt>
      <PageSubtitle value="Deferring the resize" />
      <Txt>
        Columns resize live while you drag: the new widths are written to the DOM on every mouse move and only committed
        to React state when you drop the handle, so rows don’t re-render during the drag. Cells that measure themselves
        on every width change (such as an <Code>OverflowList</Code> that decides how many items fit) still have to do
        that work on every frame, for every visible row. Set <Code>deferredResize: true</Code> on such columns: a guide
        line follows the pointer and the width is applied once, on drop. Try the <strong>Keywords</strong> column below
        and compare it with the <strong>Name</strong> column:
      </Txt>
      <ResizingDeferredExample />
      <CodeBlock code={code['ResizingDeferredExample.tsx']} />
      <PageSubtitle value="Complex usage" />
      <ResizingComplexExample />
      <CodeBlock code={code['ResizingComplexExample.tsx']} />
      <PageNavigation of={PATH} />
    </>
  );
}
