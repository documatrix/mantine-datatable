import { Box } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import { PRODUCT_NAME, REPO_LINK } from '~/app/config';
import { NavbarButton } from './NavbarButton';
import { NpmNavbarLinkButton } from './NpmNavbarLinkButton';

export function NavbarDynamicLinkButtons() {
  return (
    <Box hiddenFrom="sm">
      <NavbarButton
        icon={IconBrandGithub}
        title="View source code"
        description={`View ${PRODUCT_NAME} source code on GitHub`}
        color="gray"
        href={REPO_LINK}
      />
      <NpmNavbarLinkButton />
    </Box>
  );
}
