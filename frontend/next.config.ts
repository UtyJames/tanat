import type { NextConfig } from 'next';

/**
 * Tanat dashboard is a static client application. It talks to the Worker API
 * directly, so the export can be served from Cloudflare Pages with Wrangler.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
