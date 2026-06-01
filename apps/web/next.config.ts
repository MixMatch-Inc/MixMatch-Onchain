import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@themixmatch/types"],
  typedRoutes: true,
  webpack: (config) => {
    // Allow Next.js to resolve .js extensions to .ts files in transpiled packages
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
    };
    return config;
  },
};

export default nextConfig;
