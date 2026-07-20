import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  transpilePackages: ['@video-ai/core', '@video-ai/db'],
  webpack(webpackConfig) {
    // Allow .js imports to resolve to .ts/.tsx files (required for monorepo
    // workspace packages that use ESM-style .js extension in their source).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return webpackConfig;
  },
};

export default config;
