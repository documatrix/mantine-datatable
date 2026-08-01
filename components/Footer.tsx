import { Group, Text, useMantineTheme } from '@mantine/core';
import type { Ref } from 'react';
import { LICENSE_LINK, NPM_LINK, REPO_LINK, REPO_OWNER } from '~/app/config';
import { ExternalLink } from './ExternalLink';
import classes from './Footer.module.css';

export type FooterProps = {
  ref: Ref<HTMLDivElement>;
};

export function Footer({ ref }: FooterProps) {
  const { colors } = useMantineTheme();
  const color = colors.blue[7].substring(1);
  const badgeParams = `?style=flat&color=${color}`;
  return (
    <footer ref={ref} className={classes.root}>
      <Group className={classes.imageLinks} gap="xs">
        <ExternalLink className={classes.imageLink} to={LICENSE_LINK} rel="license">
          <img src={`https://img.shields.io/npm/l/${process.env.PACKAGE_NAME}.svg${badgeParams}`} alt="MIT License" />
        </ExternalLink>
      </Group>
      <Text size="sm" ta="center">
        Built by <ExternalLink to={`${REPO_LINK}/graphs/contributors`}>these awesome people</ExternalLink>.
        <br />
        Maintained to match our own feature requests and table-behavior semantics.
      </Text>
      <Group className={classes.imageLinks} gap="xs">
        <ExternalLink className={classes.imageLink} to={REPO_LINK}>
          <img
            src={`https://img.shields.io/github/stars/${REPO_OWNER}/${process.env.REPO_NAME}${badgeParams}`}
            alt="GitHub Stars"
          />
        </ExternalLink>
        <ExternalLink className={classes.imageLink} to={NPM_LINK}>
          <img
            src={`https://img.shields.io/npm/dm/${process.env.PACKAGE_NAME}.svg${badgeParams}`}
            alt="NPM Downloads"
          />
        </ExternalLink>
      </Group>
    </footer>
  );
}
