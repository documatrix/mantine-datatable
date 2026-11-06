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
import { allPromiseProps, getRouteMetadata } from '~/lib/utils';
import { ColumnFiltersExample } from './ColumnFiltersExample';

const PATH: Route = '/examples/column-filters';

export const metadata = getRouteMetadata(PATH);

const SERVER_CODE = `const { filters, setFilters } = useDataTableFilters({ key: 'employees' });

const { data } = useQuery({
  queryKey: ['employees', filters, page],
  queryFn: () => api.searchEmployees({ page, filters: resolveFilters(filters, { columns }) }),
});

<DataTable columns={columns} records={data?.records} filters={filters} onFiltersChange={setFilters} /* ... */ />`;

const SQL_CODE = `for (const [column, conditions] of Object.entries(filters)) {
  for (const condition of conditions) {
    const pattern = toSqlLikePattern(condition); // contains / startsWith / endsWith / like
    if (pattern) where.push(sql\`\${column} \${condition.negate ? 'NOT ' : ''}LIKE \${pattern} ESCAPE '\\\\'\`);
    // ...equals, gt, gte, lt, lte, between and empty map to =, >, >=, <, <=, BETWEEN and IS NULL
  }
}`;

const PICKER_CODE = `{
  accessor: 'shippedAt',
  filter: {
    type: 'date',
    renderPicker: ({ addCondition, close }) => (
      <MyShippingCalendar onPick={(day) => { addCondition({ operator: 'equals', value: day }); close(); }} />
    ),
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
  const code = await allPromiseProps({
    'ColumnFiltersExample.tsx': readCodeFile<string>(`${PATH}/ColumnFiltersExample.tsx`),
    'columns.tsx': readCodeFile<string>(`${PATH}/columns.tsx`),
    'api.ts': readCodeFile<string>(`${PATH}/api.ts`),
  });

  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        Give a column a <Code>filter</Code> config and {PRODUCT_NAME} renders a typed filter for it. Users add
        conditions as pills: type a value and pick how it should match, choose from options, presets or a calendar, or
        use the <InternalLink to="/examples/filter-syntax">filter syntax</InternalLink> (<Code>{'>=18'}</Code>,{' '}
        <Code>Ann*</Code>, <Code>-6d..today</Code>, <Code>!Toys</Code>). Click a pill to edit it.
      </Txt>
      <Txt>
        The state is plain JSON in the <Code>filters</Code> property, keyed by column. Plain conditions on a column are
        combined with OR, negated ones with AND (“Toys or Games, but not Baby”), and different columns with AND. The
        table below uses every filter type; scroll it sideways to reach them all.
      </Txt>
      <ColumnFiltersExample />
      <Txt>The code for this example is as follows:</Txt>
      <CodeBlock tabs={{ code, keys: ['ColumnFiltersExample.tsx', 'columns.tsx', 'api.ts'] }} />
      <PageSubtitle value="Filter types" />
      <UnorderedList>
        <li>
          <Code>text</Code> (Name, Email): contains, equals, starts/ends with and wildcard patterns; case- and
          accent-insensitive unless <Code>caseSensitive</Code> is set.
        </li>
        <li>
          <Code>select</Code> (Department, Company, Sex): static <Code>options</Code> with optional counts, or{' '}
          <Code>loadOptions</Code> for distinct values from a server, called with the typed text and an{' '}
          <Code>AbortSignal</Code>. Long lists show the first <Code>optionsLimit</Code> entries and a “Show all” entry.{' '}
          <Code>allowCustomValues: false</Code> only accepts the options, and a <Code>null</Code> option value matches
          empty cells.
        </li>
        <li>
          <Code>number</Code> (Age): comparisons and ranges.
        </li>
        <li>
          <Code>duration</Code> (Avg. response): like numbers, but typed as <Code>90s</Code> or <Code>1h30m</Code> and
          stored in the filter’s <Code>unit</Code>.
        </li>
        <li>
          <Code>date</Code> (Birth date, Last login): a calendar in the filter popover picks a day (click it twice) or a
          range, and <Code>withTime</Code> adds start and end times. Absolute dates match their whole period (
          <Code>2026-03</Code> is all of March), relative dates stay relative when persisted (<Code>-1mo</Code> is
          always last month), and presets cover the common ranges. In the filter row, the calendar opens from the icon
          next to the input.
        </li>
        <li>
          <Code>boolean</Code> (Senior): yes / no.
        </li>
        <li>
          <Code>custom</Code> (Age group): your own editor, see below.
        </li>
      </UnorderedList>
      <Txt>
        Every filter type supports “is empty” (<Code>=</Code>) and “is not empty” (<Code>!=</Code>). Restrict operators
        with <Code>operators</Code>, change what a bare value means with <Code>defaultOperator</Code>, and point the
        filter at a computed value with <Code>getValue</Code> (Name, Age and Senior do).
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
          remove. They are combined with the user’s filters with AND, so users can only narrow them down.
        </li>
        <li>
          <Code>highlightFilterMatches</Code> marks matching text in cells without a custom <Code>render</Code>. Use{' '}
          <Code>getFilterHighlights</Code> with <Code>DataTableHighlight</Code> in your own renders (set its{' '}
          <Code>caseSensitive</Code> prop for case-sensitive filters).
        </li>
        <li>
          Changing filters goes back to the first page (turn off with <Code>resetPageOnFilterChange</Code>).
        </li>
        <li>When no record matches, the empty state offers to clear the filters.</li>
      </UnorderedList>
      <PageSubtitle value="State and persistence" />
      <Txt>
        <Code>useDataTableFilters</Code> holds the state and, given a <Code>key</Code>, persists it in{' '}
        <Code>localStorage</Code> or <Code>sessionStorage</Code>. You can also manage <Code>filters</Code> yourself, or
        leave them uncontrolled with <Code>defaultFilters</Code> and react to <Code>onFiltersChange</Code>. In the
        browser, <Code>filterRecords</Code> applies filters, locked filters and an optional free-text{' '}
        <Code>search</Code> to your records, as the example does.
      </Txt>
      <PageSubtitle value="Filtering on a server" />
      <Txt>
        Everything above works the same when a server does the filtering: keep the same columns and filter state, but
        instead of calling <Code>filterRecords</Code>, send the filters with your request. Pass them through{' '}
        <Code>resolveFilters</Code> first, which turns date conditions into inclusive ranges of ISO timestamps, so the
        server never has to understand relative dates like <Code>-6d..today</Code>. The right-hand JSON below the table
        above is exactly that payload.
      </Txt>
      <CodeBlock code={SERVER_CODE} language="tsx" />
      <UnorderedList>
        <li>
          Per column, plain conditions are OR-ed and negated conditions (<Code>negate: true</Code>) are AND-ed:{' '}
          <Code>(c1 OR c2) AND NOT c3</Code>. Different columns are AND-ed.
        </li>
        <li>
          <Code>between</Code> is inclusive; either bound can be <Code>null</Code> for an open range. <Code>empty</Code>{' '}
          means <Code>NULL</Code> or an empty string.
        </li>
        <li>
          Text values are literal. <Code>toSqlLikePattern</Code> converts <Code>contains</Code>, <Code>startsWith</Code>
          , <Code>endsWith</Code> and <Code>like</Code> (wildcards <Code>*</Code> and <Code>?</Code>) to an escaped SQL{' '}
          <Code>LIKE</Code> pattern, so a user typing <Code>50%</Code> or <Code>file_1</Code> doesn’t get SQL wildcards.
        </li>
        <li>
          Select options usually come from the server too: give <Code>loadOptions</Code> an endpoint returning the
          distinct values, like the Department column. Loaded labels are remembered for pills and chips.
        </li>
        <li>
          Node backends can evaluate the payload directly with <Code>filterRecords</Code>.
        </li>
      </UnorderedList>
      <CodeBlock code={SQL_CODE} language="ts" />
      <PageSubtitle value="Custom filters" />
      <Txt>
        A <Code>custom</Code> filter renders your own editor in the popover (the chips of the Age group column in{' '}
        <Code>columns.tsx</Code>) and still stores its conditions in <Code>filters</Code>, so chips, persistence and
        locked filters keep working. <Code>format</Code> labels its pills and chips, and <Code>match</Code> decides
        which records pass in <Code>filterRecords</Code>.
      </Txt>
      <Txt>
        Date filters can swap the built-in calendar for your own picker with <Code>renderPicker</Code>, or hide it with{' '}
        <Code>withCalendar: false</Code>:
      </Txt>
      <CodeBlock code={PICKER_CODE} language="tsx" />
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
