import { Code } from '@mantine/core';
import type { Route } from 'next';
import { PRODUCT_NAME } from '~/app/config';
import { CodeBlock } from '~/components/CodeBlock';
import { InternalLink } from '~/components/InternalLink';
import { PageNavigation } from '~/components/PageNavigation';
import { PageSubtitle } from '~/components/PageSubtitle';
import { PageTitle } from '~/components/PageTitle';
import { Txt } from '~/components/Txt';
import { UnorderedList } from '~/components/UnorderedList';
import { readCodeFile } from '~/lib/code';
import { getRouteMetadata } from '~/lib/utils';
import { ColumnFiltersExample } from './ColumnFiltersExample';

const PATH: Route = '/examples/column-filters';

export const metadata = getRouteMetadata(PATH);

const CUSTOM_FILTER_CODE = `{
  accessor: 'status',
  filter: {
    type: 'custom',
    render: ({ conditions, setConditions, close }) => (
      <MyStatusPicker
        value={conditions.map((condition) => condition.value)}
        onChange={(values) => setConditions(values.map((value) => ({ operator: 'equals', value })))}
      />
    ),
    format: ({ value }) => statusLabels[value],
    match: (record, conditions) => conditions.some(({ value }) => record.status === value),
  },
}`;

const TEXTS_CODE = `<DataTable
  filterLocale="de-AT"
  filterTexts={{
    placeholder: 'Filtern…',
    clearAll: 'Alle entfernen',
    operators: { contains: (value) => \`enthält \${value}\` },
    presets: { today: 'Heute' },
  }}
  // ...
/>`;

export default async function ColumnFiltersExamplePage() {
  const code = await readCodeFile<string>(`${PATH}/ColumnFiltersExample.tsx`);

  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        Give a column a <Code>filter</Code> config and {PRODUCT_NAME} renders a typed filter for it. Users add
        conditions as pills: type a value and pick how it should match, choose from options or presets, or use the{' '}
        <InternalLink to="/examples/filter-syntax">filter syntax</InternalLink> (<Code>{'>=18'}</Code>,{' '}
        <Code>Ann*</Code>, <Code>-6d..today</Code>, <Code>!Sales</Code>). Click a pill to edit it.
      </Txt>
      <Txt>
        The state is plain JSON in the <Code>filters</Code> property, keyed by column. Plain conditions on a column are
        combined with OR, negated ones with AND (“Sales or Marketing, but not Paris”), and different columns with AND.
      </Txt>
      <ColumnFiltersExample />
      <Txt>The code for this example is as follows:</Txt>
      <CodeBlock code={code} />
      <PageSubtitle value="Filter types" />
      <UnorderedList>
        <li>
          <Code>text</Code>: contains, equals, starts/ends with and wildcard patterns; case- and accent-insensitive
          unless <Code>caseSensitive</Code> is set.
        </li>
        <li>
          <Code>number</Code> and <Code>duration</Code>: comparisons and ranges; durations accept <Code>90s</Code>,{' '}
          <Code>1h30m</Code> and store numbers in the filter’s <Code>unit</Code>.
        </li>
        <li>
          <Code>date</Code>: absolute dates match their whole period (<Code>2026-03</Code> is all of March), relative
          dates stay relative when persisted (<Code>-1mo</Code> is always last month), and presets cover the common
          ranges. Add a calendar from <Code>@mantine/dates</Code> with <Code>renderPicker</Code>.
        </li>
        <li>
          <Code>boolean</Code>: yes / no.
        </li>
        <li>
          <Code>select</Code>: static <Code>options</Code> (with optional counts) or <Code>loadOptions</Code> for
          distinct values from a server. A <Code>null</Code> option value matches empty cells. Long lists show the first{' '}
          <Code>optionsLimit</Code> entries with a “Show all” entry.
        </li>
        <li>
          <Code>custom</Code>: your own editor, see below.
        </li>
      </UnorderedList>
      <Txt>
        Every filter type supports “is empty” (<Code>=</Code>) and “is not empty” (<Code>!=</Code>). Restrict operators
        with <Code>operators</Code>, change what a bare value means with <Code>defaultOperator</Code>, and point the
        filter at a different value with <Code>getValue</Code>.
      </Txt>
      <PageSubtitle value="Showing and editing filters" />
      <UnorderedList>
        <li>
          <Code>filterDisplay=&quot;popover&quot;</Code> (default) edits filters in a popover from the header icon,
          which shows how many conditions are active.
        </li>
        <li>
          <Code>filterDisplay=&quot;row&quot;</Code> adds a row of filter inputs below the column titles, so entered
          values stay visible next to their column.
        </li>
        <li>
          <Code>withFilterChips</Code> lists all active filters as chips below the header, including filters on columns
          that are toggled off. Click a chip to edit it, or clear everything at once.
        </li>
        <li>
          <Code>lockedFilters</Code> shows filters set by your application as locked pills and chips that users can’t
          remove.
        </li>
        <li>
          <Code>highlightFilterMatches</Code> marks matching text in cells without a custom <Code>render</Code>. Use{' '}
          <Code>getFilterHighlights</Code> with <Code>DataTableHighlight</Code> in your own renders.
        </li>
        <li>
          Changing filters goes back to the first page (turn off with <Code>resetPageOnFilterChange</Code>).
        </li>
        <li>When no record matches, the empty state offers to clear the filters.</li>
      </UnorderedList>
      <PageSubtitle value="State, persistence and client-side filtering" />
      <Txt>
        <Code>useDataTableFilters</Code> holds the state and, given a <Code>key</Code>, persists it in{' '}
        <Code>localStorage</Code> or <Code>sessionStorage</Code>. You can also manage <Code>filters</Code> yourself, or
        leave them uncontrolled with <Code>defaultFilters</Code> and react to <Code>onFiltersChange</Code>.{' '}
        <Code>filterRecords</Code> applies filters (and an optional free-text <Code>search</Code>) to records in the
        browser. For filtering on a server, see{' '}
        <InternalLink to="/examples/column-filters-server-side">server-side column filters</InternalLink>.
      </Txt>
      <PageSubtitle value="Custom filters" />
      <Txt>
        A <Code>custom</Code> filter renders your own editor in the popover and still stores its state in{' '}
        <Code>filters</Code>, so chips, persistence and locked filters keep working:
      </Txt>
      <CodeBlock code={CUSTOM_FILTER_CODE} language="tsx" />
      <PageSubtitle value="Translations" />
      <Txt>
        Every text in the filter UI can be replaced through <Code>filterTexts</Code>; dates, relative dates and numbers
        are formatted with <Code>Intl</Code> in <Code>filterLocale</Code>:
      </Txt>
      <CodeBlock code={TEXTS_CODE} language="tsx" />
      <Txt>Head over to the next example to discover more features.</Txt>
      <PageNavigation of={PATH} />
    </>
  );
}
