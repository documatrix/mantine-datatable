# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Fork of Mantine DataTable, published to npm as `@neeyo/mantine-datatable`. Scope is intentionally narrower than upstream: it follows our own feature requests and table semantics. One repo holds both:

- `package/` – the library (the only thing published, built to `dist/`)
- `app/`, `components/`, `lib/`, `data/` – Next.js (app router, RSC) docs site with live examples, statically exported to GitHub Pages

## Commands

Use Bun (repo has `bun.lock`).

```bash
bun run dev              # docs site with examples (main way to manually test changes)
bun run build:package    # tsdown (ESM + CJS + .d.ts/.d.mts) + postcss CSS into dist/
bun run build:docs       # next build (static export)
bun run build            # both
bun run lint             # next typegen + biome check + tsc --noEmit (what CI runs)
bun run format           # biome format --write
```

There is no test suite. CI runs `lint`, `build:package` and `build:docs`. Verify behavior through the example pages.

## Package architecture

- `package/index.ts` is the public API: `DataTable`, `DataTableDraggableRow`, `useDataTableColumns`, everything in `types/` and `utils/`. Other hooks in `package/hooks/` are internal, so their signatures can change freely; public type changes go through `package/types/`.
- `DataTable.tsx` orchestrates everything: it calls the hooks (columns/pinning/resize/reorder/toggle, row expansion, selection, CSS-variable injection, virtualization) and composes header, rows, footer, pagination, loader and empty state sub-components.
- Layout state lives in CSS variables, not React state. `useDataTableInjectCssVariables` uses ResizeObservers on root/table/viewport/header/footer/selection header to set `--mantine-datatable-*` vars (header/footer height, scroll shadows, sticky footer position, last-row border) and fires `onScrollTo*` callbacks. Theme-derived colors come from `cssVariables.ts`.
- Row virtualization (`virtualized` prop, `hooks/useRowVirtualization.ts`) uses `@tanstack/react-virtual` with spacer rows (`DataTableSpacerRow`) above and below the rendered window. Rows need a `data-index` attribute. A row's measured height includes the trailing `tr`s after it (expansion rows) up to the next `.mantine-datatable-row` / spacer / empty row, so keep those class names intact.
- Styles: each sub-component has its own `.css`. `styles.css` imports them all; `styles.layer.css` wraps them in `@layer mantine-datatable`. Class names follow `.mantine-datatable-*`.

### React Compiler

The package is built with `babel-plugin-react-compiler` (`tsdown.config.mts`). The build prints `[react-compiler] skipped <file>:<line>: <reason>` for functions it couldn't optimize; such functions ship un-memoized. Currently only `useRowVirtualization` (TanStack's `useVirtualizer`) is expected there. Don't introduce new skips:

- Never read or write `ref.current` during render, including in hook dependency arrays. To react to an element mounting, track it in state via a callback ref (see `useTrackedElement`).
- Prefer letting the compiler memoize over hand-written `useCallback`/`useMemo` with deps that hide values from it.
- Latest-value helpers (all sync in `useInsertionEffect`, read only in effects/handlers): `useStableCallback` (stable function identity), `useOptionalCallbackRef` (same, but stays `undefined` when the handler is), `useStableValue` (ref to latest value). Mantine's `useCallbackRef` syncs too late (in `useEffect`), so don't use it.

Rows are memoized; any prop passed to every row (e.g. `rowExpansion.content`, `rowStyle`) must keep a stable identity or all visible rows re-render.

## Docs site

- Each example lives in `app/examples/<feature>/`: a server `page.tsx` plus `*Example.tsx` client components. `page.tsx` shows the source with `readCodeFile` (`lib/code.ts`) + `CodeBlock`. `readCodeFile` supports `// example-start <name>` / `example-skip` / `example-resume` / `example-end` markers to show only parts of a file.
- Examples import from `'__PACKAGE__'` (tsconfig path alias to `./package/`). `readCodeFile` replaces it with the real package name in displayed code. Never import `mantine-datatable` directly in examples.
- New pages must be registered in `ROUTES` in `app/config.ts` (navigation, metadata, prev/next links).
- Sample data: `data/` (`companies.json`, `employees.json`, `departments.json`, `async.ts` for simulated latency/errors).
- A new or changed feature needs an example page; that's the documentation.

## Releases

PR titles use Conventional Commits. release-please maintains a rolling release PR; merging *that* PR publishes to npm and deploys the docs. Merging into `main` alone releases nothing.
