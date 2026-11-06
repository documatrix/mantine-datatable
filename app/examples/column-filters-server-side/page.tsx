import { Code } from '@mantine/core';
import type { Route } from 'next';
import { CodeBlock } from '~/components/CodeBlock';
import { InternalLink } from '~/components/InternalLink';
import { PageNavigation } from '~/components/PageNavigation';
import { PageSubtitle } from '~/components/PageSubtitle';
import { PageTitle } from '~/components/PageTitle';
import { Txt } from '~/components/Txt';
import { UnorderedList } from '~/components/UnorderedList';
import { readCodeFile } from '~/lib/code';
import { allPromiseProps, getRouteMetadata } from '~/lib/utils';
import { ColumnFiltersServerSideExample } from './ColumnFiltersServerSideExample';

const PATH: Route = '/examples/column-filters-server-side';

export const metadata = getRouteMetadata(PATH);

const SQL_CODE = `for (const [column, conditions] of Object.entries(filters)) {
  for (const condition of conditions) {
    const pattern = toSqlLikePattern(condition); // contains / startsWith / endsWith / like
    if (pattern) where.push(sql\`\${column} \${condition.negate ? 'NOT ' : ''}LIKE \${pattern} ESCAPE '\\\\'\`);
    // ...equals, gt, gte, lt, lte, between and empty map to =, >, >=, <, <=, BETWEEN and IS NULL
  }
}`;

export default async function ColumnFiltersServerSideExamplePage() {
  const code = await allPromiseProps({
    'ColumnFiltersServerSideExample.tsx': readCodeFile<string>(`${PATH}/ColumnFiltersServerSideExample.tsx`),
    'api.ts': readCodeFile<string>(`${PATH}/api.ts`),
  });

  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        The filter state is plain JSON, so filtering on a server means sending <Code>filters</Code> along with your
        request. Pass them through <Code>resolveFilters</Code> first: it turns date conditions into inclusive ranges of
        ISO timestamps, so the server never has to understand relative dates like <Code>-6d..today</Code>. Text, number
        and select conditions are sent unchanged.
      </Txt>
      <ColumnFiltersServerSideExample />
      <Txt>
        The department filter loads its options with <Code>loadOptions</Code>, which receives the typed text and an{' '}
        <Code>AbortSignal</Code>. Loaded labels are remembered, so pills and chips keep showing them.
      </Txt>
      <CodeBlock tabs={{ code, keys: ['ColumnFiltersServerSideExample.tsx', 'api.ts'] }} />
      <PageSubtitle value="Translating conditions on the server" />
      <UnorderedList>
        <li>
          Per column, plain conditions are OR-ed and negated conditions (<Code>negate: true</Code>) are AND-ed:{' '}
          <Code>(c1 OR c2) AND NOT c3</Code>. Different columns are AND-ed.
        </li>
        <li>
          <Code>between</Code> is inclusive; either bound can be <Code>null</Code> for an open range.
        </li>
        <li>
          <Code>empty</Code> means <Code>NULL</Code> or an empty string.
        </li>
        <li>
          Text values are literal. <Code>toSqlLikePattern</Code> converts <Code>contains</Code>, <Code>startsWith</Code>
          , <Code>endsWith</Code> and <Code>like</Code> (wildcards <Code>*</Code> and <Code>?</Code>) to an escaped SQL{' '}
          <Code>LIKE</Code> pattern, so a user typing <Code>50%</Code> or <Code>file_1</Code> doesn’t get SQL wildcards.
        </li>
        <li>
          Node backends can evaluate filters directly with <Code>filterRecords</Code>, as the mock API above does.
        </li>
      </UnorderedList>
      <CodeBlock code={SQL_CODE} language="ts" />
      <Txt>
        Try conditions in the <InternalLink to="/examples/filter-syntax">filter syntax playground</InternalLink> to see
        exactly what gets sent.
      </Txt>
      <PageNavigation of={PATH} />
    </>
  );
}
