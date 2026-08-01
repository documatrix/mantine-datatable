import { Badge } from '@mantine/core';
import classes from './VersionBadge.module.css';

export function VersionBadge() {
  return (
    <Badge className={classes.root} variant="filled" color="gray">
      {process.env.PACKAGE_VERSION}
    </Badge>
  );
}
