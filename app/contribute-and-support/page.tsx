import { Box, Code } from '@mantine/core';
import type { Route } from 'next';
import { PRODUCT_NAME, REPO_LINK } from '~/app/config';
import { ExternalLink } from '~/components/ExternalLink';
import { PageNavigation } from '~/components/PageNavigation';
import { PageSubtitle } from '~/components/PageSubtitle';
import { PageTitle } from '~/components/PageTitle';
import { Txt } from '~/components/Txt';
import { getRouteMetadata } from '~/lib/utils';

const PATH: Route = '/contribute-and-support';
export const metadata = getRouteMetadata(PATH);

export default function ContributeAndSupportPage() {
  return (
    <>
      <PageTitle of={PATH} />
      <Txt>
        {PRODUCT_NAME} is maintained as a fork of the original open-source project, and its development focuses on our
        own feature requests and semantics for how a table should behave. New functionality is driven by what we need in
        our applications, so the scope is intentionally narrower than that of a general-purpose community package.
      </Txt>
      <PageSubtitle value="Raise issues and discuss new features" />
      <Txt>
        If you find a bug please don’t hesitate to{' '}
        <ExternalLink to={`${REPO_LINK}/issues`}>raise an issue</ExternalLink>.
        <br />
        If you have an idea about a new or missing feature, let’s discuss it{' '}
        <ExternalLink to={`${REPO_LINK}/discussions`}>here</ExternalLink>.
      </Txt>
      <Txt warning>
        Be considerate when asking for a new feature!
        <br />
        Proposals are evaluated against our feature requests and our expectations of how a table should behave, so
        features that only cater to edge cases outside that scope may not be picked up.
      </Txt>
      <PageSubtitle value="Become a code contributor" />
      <Txt>If you’re willing to put your effort into it, coming up with a pull-request would be fantastic.</Txt>
      <Txt info>
        Things to consider before contributing:
        <Box component="ul" ml={-20}>
          <li>
            The <ExternalLink to={REPO_LINK}>repository</ExternalLink> is holding the code for both {PRODUCT_NAME}{' '}
            package and the documentation website you’re looking at.
            <br />
            Since the repo root contains a <Code>bun.lock</Code> file, <strong>it should be obvious</strong> that you
            have to use <ExternalLink to="https://bun.sh/">Bun</ExternalLink> to install dependencies and run scripts.
            <br />
            Use <Code>bun run dev</Code> to start the development server, <Code>bun run lint</Code> to check the code
            for linting errors, and <Code>bun run build</Code> to check that the code compiles.
            <br />
            Running <Code>bun run format</Code> will automatically format your code with{' '}
            <ExternalLink to="https://biomejs.dev/">Biome</ExternalLink>, so that it adheres to the project’s coding
            style.
            <br />
            This is a <ExternalLink to="https://nextjs.org/">Next.js</ExternalLink> project with an{' '}
            <ExternalLink to="https://nextjs.org/docs/app/building-your-application/routing">app router</ExternalLink>{' '}
            and makes use of{' '}
            <ExternalLink to="https://nextjs.org/docs/app/building-your-application/rendering/server-components">
              React Server Components
            </ExternalLink>
            .
            <br />
            <strong>Make sure you have a good grasp of the above before attempting to contribute.</strong>
            <br />
            The {PRODUCT_NAME} package code is located in the <Code>package</Code> folder, while the documentation
            website code is located in the <Code>app</Code> folder.
            <br />
            The <Code>components</Code> folder holds generic React components used by the documentation website.
          </li>
          <li>
            If you want to implement a new feature or improve an existing one, make sure to add an example page and/or
            alter the one(s) already referring to it.
            <br />
            It’s not a feature if other people don’t know about it or don’t understand how to use it.
          </li>
          <li>
            <strong>
              Please target your PRs to the <Code>main</Code> branch and use{' '}
              <ExternalLink to="https://www.conventionalcommits.org/">Conventional Commits</ExternalLink> in your PR
              titles.
            </strong>
            <br />
            Releases are automated with{' '}
            <ExternalLink to="https://github.com/googleapis/release-please">release-please</ExternalLink>, which derives
            version bumps and the changelog from commit messages. Merging into <Code>main</Code> does not release
            anything by itself — merging the rolling release PR cuts the release, publishes the package and deploys this
            website, so <Code>main</Code> may be ahead of the latest released version.
          </li>
        </Box>
      </Txt>
      <PageNavigation of={PATH} />
    </>
  );
}
