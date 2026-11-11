import { Code } from '@mantine/core';
import type { Route } from 'next';
import { InternalLink } from '~/components/InternalLink';
import { PageNavigation } from '~/components/PageNavigation';
import { PageSubtitle } from '~/components/PageSubtitle';
import { PageTitle } from '~/components/PageTitle';
import { Txt } from '~/components/Txt';
import { UnorderedList } from '~/components/UnorderedList';
import { getRouteMetadata } from '~/lib/utils';
import { FilterSyntaxPlayground, FilterSyntaxReference } from './FilterSyntaxPlayground';

const PATH: Route = '/examples/filter-syntax';

export const metadata = getRouteMetadata(PATH);

export default function FilterSyntaxPage() {
  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        Filter inputs understand a small syntax, so experienced users can type a whole condition instead of clicking
        through menus. It works the same in every filter type; the type only decides how values are read. Input is
        parsed in the browser: mistakes are flagged while typing, and the result is stored as structured conditions,
        never as text. The dropdown under each input also offers the other ways to match a typed value, so nobody has to
        learn the syntax.
      </Txt>
      <PageSubtitle value="Rules that apply everywhere" />
      <UnorderedList>
        <li>
          <Code>,</Code> separates conditions. Plain conditions are OR-ed, negated ones AND-ed: <Code>a, b, !c</Code>{' '}
          means “a or b, but not c”.
        </li>
        <li>
          <Code>!</Code> negates any condition: <Code>!foo</Code>, <Code>!=foo</Code>, <Code>!5..10</Code>,{' '}
          <Code>!=</Code>.
        </li>
        <li>
          <Code>=</Code> alone means “is empty”, <Code>!=</Code> alone “is not empty”.
        </li>
        <li>
          <Code>{'> >= < <='}</Code> compare, <Code>a..b</Code> is an inclusive range, <Code>a..</Code> and{' '}
          <Code>..b</Code> are open ranges. <Code>≥ ≤ ≠</Code> work too.
        </li>
        <li>
          In text, <Code>*</Code> matches any characters and <Code>?</Code> one character. Quotes (
          <Code>&quot;a, b*&quot;</Code>) or a backslash (<Code>a\*b</Code>) keep them literal.
        </li>
      </UnorderedList>
      <PageSubtitle value="Playground" />
      <Txt>Type conditions and see how they are stored, shown, edited and sent to a server:</Txt>
      <FilterSyntaxPlayground />
      <PageSubtitle value="Text" />
      <FilterSyntaxReference type="text" />
      <PageSubtitle value="Numbers" />
      <FilterSyntaxReference type="number" />
      <PageSubtitle value="Durations" />
      <FilterSyntaxReference type="duration" />
      <PageSubtitle value="Dates" />
      <Txt>
        Absolute dates match their whole period, so <Code>2026-03</Code> is all of March and <Code>{'>2026-03'}</Code>{' '}
        starts in April. Relative dates are offsets from now with a unit (<Code>y</Code>, <Code>mo</Code>,{' '}
        <Code>w</Code>, <Code>d</Code>, <Code>h</Code>, <Code>min</Code>) and also cover their whole period:{' '}
        <Code>0w</Code> is this week, <Code>-1mo</Code> last month. They stay relative when filters are stored.
      </Txt>
      <FilterSyntaxReference type="date" />
      <PageSubtitle value="Yes / no and options" />
      <FilterSyntaxReference type="boolean" />
      <FilterSyntaxReference type="select" />
      <Txt>
        See <InternalLink to="/examples/column-filters">column filters</InternalLink> for the table setup.
      </Txt>
      <PageNavigation of={PATH} />
    </>
  );
}
