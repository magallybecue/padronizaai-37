/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS handled by middleware.ts
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;