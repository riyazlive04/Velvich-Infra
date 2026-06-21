/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is needed for the Docker image (Linux). It uses symlinks that
  // Windows blocks without Developer Mode, so gate it behind a build flag — a
  // normal local `pnpm build` produces a regular .next that builds anywhere.
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  reactStrictMode: true,
  // @velvich/shared ships compiled CJS in dist; transpile so Next bundles it cleanly.
  transpilePackages: ['@velvich/shared'],
  async rewrites() {
    // Proxy /api/* to the NestJS API so cookies are same-origin in the browser.
    const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
