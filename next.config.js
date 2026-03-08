/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow Next.js hot reload + Stripe scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
              // Allow Stripe iframes and Google Maps
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              // Allow API calls to Stripe, Google, Turso
              "connect-src 'self' https://api.stripe.com https://maps.googleapis.com wss://ws.pusherapp.com",
              // Allow styles from Stripe and Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Allow images from anywhere (covers user-uploaded content)
              "img-src 'self' data: blob: https:",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
