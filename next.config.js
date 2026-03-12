/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  images: {
    unoptimized: true,
    domains: ['dailycard-media.s3.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dailycard-media.s3.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: 'memory',
      }
    }

    return config
  },
}

module.exports = nextConfig