import { Code } from '@mantine/core';
import type { Route } from 'next';
import { CodeBlock } from '~/components/CodeBlock';
import { PageNavigation } from '~/components/PageNavigation';
import { PageSubtitle } from '~/components/PageSubtitle';
import { PageTitle } from '~/components/PageTitle';
import { Txt } from '~/components/Txt';
import { readCodeFile } from '~/lib/code';
import { allPromiseProps, getRouteMetadata } from '~/lib/utils';
import { VirtualizationExample } from './VirtualizationExample';
import { VirtualizationWithAllFeaturesExample } from './VirtualizationWithAllFeaturesExample';

const PATH: Route = '/examples/virtualization';

export const metadata = getRouteMetadata(PATH);

export default async function VirtualizationExamplePage() {
  const code = await allPromiseProps({
    'VirtualizationExample.tsx': readCodeFile<string>(`${PATH}/VirtualizationExample.tsx`),
    'VirtualizationWithAllFeaturesExample.tsx': readCodeFile<string>(
      `${PATH}/VirtualizationWithAllFeaturesExample.tsx`
    ),
  });

  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        When dealing with thousands of records, rendering every row in the DOM will make the browser struggle. Set the{' '}
        <Code>virtualized</Code> property to virtualize rows with <Code>@tanstack/react-virtual</Code> — the same
        technique showcased in the official Mantine <Code>Table</Code> documentation — so only the rows intersecting the
        scrollable viewport (plus a configurable overscan) are actually rendered:
      </Txt>
      <VirtualizationExample />
      <Txt>The table above holds 5,000 records, but only renders the handful of rows you can see:</Txt>
      <CodeBlock code={code['VirtualizationExample.tsx']} />
      <Txt info>
        Virtualization requires the table to be vertically scrollable, so make sure to constrain its <Code>height</Code>{' '}
        or <Code>maxHeight</Code>. Since rows are measured dynamically as they are rendered, the{' '}
        <Code>virtualizedRowHeight</Code> estimate doesn’t need to be exact; you can also tune the number of rows
        rendered outside the viewport with <Code>virtualizedOverscan</Code>.
      </Txt>
      <PageSubtitle value="Combining virtualization with other features" />
      <Txt>
        Virtualization plays well with the other features the component offers, such as sorting, records selection
        (including the Gmail-style shift-click batch selection), row expansion, column pinning, striped rows and hover
        highlighting. You can also use the <Code>virtualizerRef</Code> property to get hold of the underlying{' '}
        <Code>@tanstack/react-virtual</Code> instance and imperatively scroll to any row with{' '}
        <Code>scrollToIndex()</Code>, even if it’s not currently rendered:
      </Txt>
      <VirtualizationWithAllFeaturesExample />
      <Txt>Here is the code:</Txt>
      <CodeBlock code={code['VirtualizationWithAllFeaturesExample.tsx']} />
      <Txt>Head over to the next example to discover more features.</Txt>
      <PageNavigation of={PATH} />
    </>
  );
}
