import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Baobab Content Engine is a headless engine (ADR-0011 §4.1) — the
  // Next.js app here exists only to host Payload's Admin UI and REST/
  // GraphQL routes, not a customer-facing frontend.
  reactStrictMode: true,
  // Produces a self-contained `.next/standalone` server so the production
  // container image doesn't need the full node_modules tree (ADR-0020
  // §43-44 — reproducible, immutable container images).
  output: 'standalone',
  experimental: {
    // The rest of this codebase (payload.config.ts, src/collections,
    // src/baobab) uses explicit `.js` extensions on relative imports per
    // Node's strict ESM/NodeNext resolution rules. This teaches webpack to
    // resolve those specifiers to the actual `.ts`/`.tsx` source files.
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
    },
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
