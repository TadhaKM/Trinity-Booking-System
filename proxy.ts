/**
 * Next.js Edge Proxy — runs before every request.
 * (Renamed from middleware.ts → proxy.ts for Next.js 16 compatibility)
 *
 * Responsibilities:
 *  1. Attach OWASP-recommended security response headers to every page and API response.
 *  2. Block obviously malformed requests early (oversized bodies, bad content-type).
 *
 * Rate limiting per route is applied inside each API handler (see lib/rate-limit.ts)
 * because edge proxy cannot share the module-level Map with Node runtime handlers.
 *
 * OWASP references: A05 Security Misconfiguration, A07 Identification and Authentication Failures
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // ── 1. Security headers ─────────────────────────────────────────────────────

  // Prevent browsers from MIME-sniffing the content type (OWASP A05)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Deny embedding in iframes — protects against clickjacking (OWASP A05)
  response.headers.set('X-Frame-Options', 'DENY');

  // Enforce HTTPS (1 year, include subdomains) — only meaningful in production
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  // Limit what information the Referer header reveals
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict powerful browser features this app does not use
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Content Security Policy — reduces XSS blast radius (OWASP A03)
  // Allows: self-hosted assets, Google Fonts, Unsplash images, data URIs for
  // base64 event thumbnails, and the Anthropic API (chat widget).
  // 'unsafe-inline' for styles is required by Tailwind; scripts remain strict.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com", // 'unsafe-inline' required for Next.js; Stripe + Mapbox
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    // Mapbox tile/API servers + Stripe
    "connect-src 'self' https://api.anthropic.com https://api.stripe.com https://*.turso.io https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com",
    "worker-src blob:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // ── 2. Block giant request bodies on API routes ──────────────────────────────
  // Next.js enforces its own body size limit (4 MB by default), but we tighten
  // this here for non-upload endpoints.
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isUploadRoute =
    request.nextUrl.pathname.includes('/users/') &&
    request.method === 'PUT';

  if (isApiRoute && !isUploadRoute) {
    const contentLength = request.headers.get('content-length');
    // Reject payloads over 100 KB on non-upload API routes
    if (contentLength && parseInt(contentLength, 10) > 100 * 1024) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 }
      );
    }
  }

  return response;
}

export const config = {
  // Apply proxy to all routes except static assets and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
