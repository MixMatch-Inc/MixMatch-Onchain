import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @repo/ui ships TypeScript source (see packages/ui/package.json `exports`); Next compiles it.
  transpilePackages: ['@repo/ui'],
  // Self-contained server bundle for the Docker image (apps/web/Dockerfile).
  output: 'standalone',
  // The app lives in a pnpm monorepo: trace dependencies from the repo root so workspace packages are included.
  outputFileTracingRoot: path.join(here, '../../'),
};

export default nextConfig;
