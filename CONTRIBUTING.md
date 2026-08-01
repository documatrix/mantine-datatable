# Contributing

This repository is a fork of the original open-source Mantine DataTable project.
It is maintained to match **our own feature requests and semantics for how a table should behave**, so its scope is intentionally narrower than that of a general-purpose community package — please keep that in mind when proposing changes.

If you find a bug, please feel free to [raise an issue](https://github.com/documatrix/mantine-datatable/issues).
If you have an idea about a new or missing feature, let's discuss it [here](https://github.com/documatrix/mantine-datatable/discussions) before putting significant effort into a PR.

## Things to keep in mind

The repository is holding the code for both Mantine DataTable package and its documentation website.  
Since the repo root contains a `bun.lock` file, it **should be obvious** that you have to use [Bun](https://bun.sh/) to install dependencies and run scripts.  
Use `bun run dev` to start the development server, `bun run lint` to check the code for linting errors, and `bun run build` to check that the code compiles.  
Running `bun run format` will automatically format your code with [Biome](https://biomejs.dev/), so that it adheres to the project’s coding style.  
This is a [Next.js](https://nextjs.org/) project with an [app router](https://nextjs.org/docs/app/building-your-application/routing) and makes use of [React Server Components]().  
**Make sure you have a good grasp of the above before attempting to contribute.**

The Mantine DataTable package code is located in the `package` folder, while the documentation website code is located in the `app` folder.  
The `components` folder holds generic React components used by the documentation website.  
If you want to implement a new feature or improve an existing one, make sure to add an example page and/or alter the one(s) already referring to it.  
It’s not a feature if other people don’t know about it or don’t understand how to use it.

**Please target your PRs to the `main` branch and use [Conventional Commits](https://www.conventionalcommits.org/) in your PR titles** (e.g. `feat: ...`, `fix: ...`) — releases are automated with [release-please](https://github.com/googleapis/release-please), which derives version bumps and the changelog from them.
Merging into `main` does not release anything by itself: release-please maintains a rolling release PR, and merging *that* PR cuts the GitHub release, publishes to npm and deploys the docs. `main` may therefore be ahead of the latest released version.
