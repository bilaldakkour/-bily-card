/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production'
const scriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline' https: blob:"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:"
const contentSecurityPolicy = [
  "default-src 'self' https: data: blob:",
  "base-uri 'self'",
  "form-action 'self' https:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: ws: wss:",
  "frame-src 'self' https:",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ')

const nextConfig = {
  compress: true,
  experimental: {
    instrumentationHook: true,
  },
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: contentSecurityPolicy,
      },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
      },
      ...(isProduction
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
          ]
        : []),
    ]

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
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
