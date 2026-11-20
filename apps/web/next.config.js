import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image (apps/web/Dockerfile).
  output: 'standalone',
  // The app lives in a pnpm monorepo: trace dependencies from the repo root so workspace packages are included.
  outputFileTracingRoot: path.join(here, '../../'),
};

export default nextConfig;
