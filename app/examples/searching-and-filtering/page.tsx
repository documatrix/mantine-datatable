import { Code } from '@mantine/core';
import type { Route } from 'next';
import { PRODUCT_NAME } from '~/app/config';
import { CodeBlock } from '~/components/CodeBlock';
import { ExternalLink } from '~/components/ExternalLink';
import { InternalLink } from '~/components/InternalLink';
import { PageNavigation } from '~/components/PageNavigation';
import { PageTitle } from '~/components/PageTitle';
import { Txt } from '~/components/Txt';
import { readCodeFile } from '~/lib/code';
import { getRouteMetadata } from '~/lib/utils';
import { SearchingAndFilteringExample } from './SearchingAndFilteringExample';

const PATH: Route = '/examples/searching-and-filtering';

export const metadata = getRouteMetadata(PATH);

export default async function SearchingAndFilteringExamplePage() {
  const code = await readCodeFile<string>(`${PATH}/SearchingAndFilteringExample.tsx`);

  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        For most tables the built-in <InternalLink to="/examples/column-filters">column filters</InternalLink> are the
        quickest route. If you need a completely different UI, you can render any node in the header filter popover by
        passing it as the column <Code>filter</Code>, set <Code>filtering</Code> to mark the column as filtered, and
        adjust the <Code>records</Code> you pass to {PRODUCT_NAME} yourself:
      </Txt>
      <SearchingAndFilteringExample />
      <Txt>The code for this example is as follows:</Txt>
      <CodeBlock code={code} />
      <Txt idea>
        To use the Mantine Component with a popover inside the filter column property, you need to render the child
        properties without using a Portal. Please refer to the Mantine documentation on{' '}
        <ExternalLink to="https://mantine.dev/core/popover/#nested-popovers">Nested Popovers</ExternalLink> for more
        details.
      </Txt>
      <Txt>Head over to the next example to discover more features.</Txt>
      <PageNavigation of={PATH} />
    </>
  );
}
