const { name: PACKAGE_NAME, version: PACKAGE_VERSION } = require('./package.json');

// Repo / GitHub Pages slug — intentionally decoupled from the scoped npm package name
const REPO_NAME = 'mantine-datatable';

module.exports = async () => {
  const { downloads } = await fetch(`https://api.npmjs.org/downloads/point/last-month/${PACKAGE_NAME}`)
    .then((res) => res.json())
    .catch(() => ({ downloads: 0 }));

  /**
   * @type {import('next').NextConfig}
   */
  const config = {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    typedRoutes: true,
    experimental: {
      optimizePackageImports: [
        '@mantine/code-highlight',
        '@mantine/core',
        '@mantine/dates',
        '@mantine/hooks',
        '@mantine/modals',
        '@mantine/notifications',
      ],
    },
    env: {
      GITHUB_PAGES: String(process.env.GITHUB_PAGES === 'TRUE' || false).toUpperCase(),
      PACKAGE_NAME,
      PACKAGE_VERSION,
      REPO_NAME,
      INITIAL_NPM_DOWNLOADS: String(downloads),
    },
  };

  if (process.env.GITHUB_PAGES) config.basePath = `/${REPO_NAME}`;

  return config;
};
