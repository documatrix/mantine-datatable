import { Group, Stack, Text } from '@mantine/core';
import { IconDiscountCheck, IconExternalLink, IconScale } from '@tabler/icons-react';
import clsx from 'clsx';
import { LICENSE_LINK, MANTINE_LINK, REPO_LINK } from '~/app/config';
import { ExternalLink } from '~/components/ExternalLink';
import classes from './HomePageSubtitle.module.css';

export function HomePageSubtitle() {
  return (
    <Stack gap={4}>
      <Group gap={8} align="flex-start" wrap="nowrap">
        <IconDiscountCheck className={clsx(classes.leftIcon, classes.iconGreen)} />
        <Text size="sm">maintained to match our own feature requests and semantics for how a table should behave</Text>
      </Group>
      <Group gap={8} align="flex-start" wrap="nowrap">
        <IconScale className={clsx(classes.leftIcon, classes.iconGreen)} />
        <Text size="sm">
          open-source <ExternalLink to={REPO_LINK}>on GitHub</ExternalLink> with a{' '}
          <ExternalLink to={LICENSE_LINK}>permissive license</ExternalLink>
        </Text>
      </Group>
      <Group gap={8} align="flex-start" wrap="nowrap">
        <IconDiscountCheck className={clsx(classes.leftIcon, classes.iconBlue)} />
        <Text size="sm">
          compatible with{' '}
          <ExternalLink className="nowrap" to={MANTINE_LINK}>
            Mantine V9.x <IconExternalLink className={classes.linkIcon} />
          </ExternalLink>
        </Text>
      </Group>
    </Stack>
  );
}
