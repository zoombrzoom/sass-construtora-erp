/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // PWA Configuration
  // Note: Service Worker will be registered manually
  eslint: {
    // Ignore ESLint errors during builds (ESLint 9 compatibility issue)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds (we've fixed most errors)
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
