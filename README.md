# Mantine DataTable

![Deploy docs workflow](https://github.com/documatrix/mantine-datatable/actions/workflows/deploy-docs.yml/badge.svg)  
[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]
[![Stars][stars-image]][stars-url]
[![Last commit][last-commit-image]][repo-url]
[![Language][language-image]][repo-url]

The [lightweight](https://bundlephobia.com/package/@neeyo/mantine-datatable), dependency-free, **dark-theme aware** table component for your Mantine UI data-rich applications, featuring asynchronous data loading support, pagination, intuitive Gmail-style additive batch rows selection, column sorting, custom cell data rendering, row expansion, nesting, and [much more](https://documatrix.github.io/mantine-datatable/).

> ℹ️ This repository is a fork of the original open-source Mantine DataTable project.
> It is maintained to match **our own feature requests and semantics for how a table should behave**, so its scope is intentionally narrower than that of a general-purpose community package.

[![Mantine DataTable](https://user-images.githubusercontent.com/581999/294180790-93289cec-4d73-47b5-988f-8c93dd3443fe.png)](https://documatrix.github.io/mantine-datatable/)

**⚠️ Requires Mantine V9.x.**

## Features

- **Lightweight** - no external dependencies, [no bloat](https://bundlephobia.com/package/@neeyo/mantine-datatable)
- **Dark-theme aware** - automatically adapts to the current [Mantine color scheme](https://mantine.dev/theming/color-schemes/)
- **[Fully customizable](https://documatrix.github.io/mantine-datatable/examples/overriding-the-default-styles)** - you can customize the look and feel of the table and its components
- **[Asynchronous data loading](https://documatrix.github.io/mantine-datatable/examples/asynchronous-data-loading)** - load data from a remote API endpoint and show a loading indicator while waiting for the response
- **[Pagination](https://documatrix.github.io/mantine-datatable/examples/pagination)** - split large data sets into pages
- **[Column sorting](https://documatrix.github.io/mantine-datatable/examples/sorting)** - sort data by one or more columns
- **[Custom cell data rendering](https://documatrix.github.io/mantine-datatable/examples/column-properties-and-styling)** - render cell data using custom components
- **[Row expansion](https://documatrix.github.io/mantine-datatable/examples/expanding-rows)** - expand a row to show additional details
- **[Nesting](https://documatrix.github.io/mantine-datatable/examples/nested-tables)** - nest tables to show hierarchical data
- **[Additive batch rows selection](https://documatrix.github.io/mantine-datatable/examples/records-selection)** - select or deselect ranges of rows using the Shift key
- **[Automatically-scrollable](https://documatrix.github.io/mantine-datatable/examples/scrollable-vs-auto-height)** - automatically scrollable or auto-height
- **[AutoAnimate support](https://documatrix.github.io/mantine-datatable/examples/using-with-auto-animate)** - animate row sorting, addition and removal
- **[Column reordering, toggling](https://documatrix.github.io/mantine-datatable/examples/column-dragging-and-toggling)** and **[resizing](https://documatrix.github.io/mantine-datatable/examples/column-resizing)** - persisted to local storage
- **[Drag-and-drop support](https://documatrix.github.io/mantine-datatable/examples/row-dragging)** - implemented using [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- **[Comprehensive RTL support](https://documatrix.github.io/mantine-datatable/examples/rtl-support)** - all features automatically adapt to [Mantine `DirectionProvider`](https://mantine.dev/styles/rtl/)'s settings
- **More** - check out the [full documentation](https://documatrix.github.io/mantine-datatable/)

## Full documentation and examples

Visit [documatrix.github.io/mantine-datatable](https://documatrix.github.io/mantine-datatable/) to view the full documentation and learn how to use it by browsing a comprehensive list of examples.

## Quickstart

Create a new [application with Mantine](https://mantine.dev/getting-started/), make sure to have the `clsx` peer dependency installed,
then install the package with `npm i @neeyo/mantine-datatable`, `yarn add @neeyo/mantine-datatable`, `pnpm add @neeyo/mantine-datatable` or `bun add @neeyo/mantine-datatable`.

Import the necessary CSS files:

```ts
import '@mantine/core/styles.layer.css';
import '@neeyo/mantine-datatable/styles.layer.css';
import './layout.css';
```

Make sure to [apply the styles in the correct order](https://mantine.dev/styles/mantine-styles/):

```css
/* layout.css */
/* 👇 Apply Mantine core styles first, DataTable styles second */
@layer mantine, mantine-datatable;
```

Use the component in your code:

```ts
'use client';

import { Box } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { DataTable } from '@neeyo/mantine-datatable';

export function GettingStartedExample() {
  return (
    <DataTable
      withTableBorder
      borderRadius="sm"
      withColumnBorders
      striped
      highlightOnHover
      // 👇 provide data
      records={[
        { id: 1, name: 'Joe Biden', bornIn: 1942, party: 'Democratic' },
        // more records...
      ]}
      // 👇 define columns
      columns={[
        {
          accessor: 'id',
          // 👇 this column has a custom title
          title: '#',
          // 👇 right-align column
          textAlign: 'right',
        },
        { accessor: 'name' },
        {
          accessor: 'party',
          // 👇 this column has custom cell data rendering
          render: ({ party }) => (
            <Box fw={700} c={party === 'Democratic' ? 'blue' : 'red'}>
              {party.slice(0, 3).toUpperCase()}
            </Box>
          ),
        },
        { accessor: 'bornIn' },
      ]}
      // 👇 execute this callback when a row is clicked
      onRowClick={({ record: { name, party, bornIn } }) =>
        showNotification({
          title: `Clicked on ${name}`,
          message: `You clicked on ${name}, a ${party.toLowerCase()} president born in ${bornIn}`,
          withBorder: true,
        })
      }
    />
  );
}
```

Make sure to browse the comprehensive list of [usage examples](https://documatrix.github.io/mantine-datatable/examples/basic-usage) to learn how to unleash the full power of Mantine DataTable.

## Contributing

See the [contributing guide in the documentation website](https://documatrix.github.io/mantine-datatable/contribute-and-support) or the repo [CONTRIBUTING.md](https://github.com/documatrix/mantine-datatable/blob/main/CONTRIBUTING.md) file for details.

Keep in mind that development focuses on our own feature requests and semantics on how a table should behave — please discuss new ideas in an issue before putting significant effort into a PR.

💡 Target your PRs to the `main` branch and use [Conventional Commits](https://www.conventionalcommits.org/) in PR titles — releases are automated with [release-please](https://github.com/googleapis/release-please).

## License

The [MIT License](LICENSE).
This project is a fork; the LICENSE file retains the original copyright notice, as required by the MIT license.

[npm-url]: https://npmjs.org/package/@neeyo/mantine-datatable
[repo-url]: https://github.com/documatrix/mantine-datatable
[stars-url]: https://github.com/documatrix/mantine-datatable/stargazers
[license-url]: LICENSE
[npm-image]: https://img.shields.io/npm/v/@neeyo/mantine-datatable.svg?style=flat-square
[license-image]: http://img.shields.io/npm/l/@neeyo/mantine-datatable.svg?style=flat-square
[stars-image]: https://img.shields.io/github/stars/documatrix/mantine-datatable?style=flat-square
[last-commit-image]: https://img.shields.io/github/last-commit/documatrix/mantine-datatable?style=flat-square
[language-image]: https://img.shields.io/github/languages/top/documatrix/mantine-datatable?style=flat-square
