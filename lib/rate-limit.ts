/**
 * In-memory sliding-window rate limiter.
 *
 * Works for single-instance deployments (development + small production).
 * For distributed / serverless at scale, replace the Map with Redis/Upstash.
 *
 * Limits are intentionally generous for normal usage but strict enough to
 * stop brute-force and enumeration attacks.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Module-level store persists across requests within the same process instance
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  },
  10 * 60 * 1000
);

export interface RateLimitResult {
  /** true = request is allowed through */
  success: boolean;
  /** requests remaining in this window */
  remaining: number;
  /** milliseconds until the window resets (0 when allowed) */
  retryAfterMs: number;
}

/**
 * Check rate limit for a given key.
 *
 * @param namespace  Route-level label, e.g. 'auth:login'
 * @param identifier IP address or userId string
 * @param limit      Max allowed requests per window
 * @param windowMs   Window length in milliseconds
 */
export function rateLimit(
  namespace: string,
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Start a new window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, retryAfterMs: 0 };
}

/**
 * Extract the real client IP from a Next.js request.
 * Reads proxy-forwarded headers before falling back to a local address.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

/**
 * Build a standard 429 Too Many Requests response.
 */
export function rateLimitResponse(retryAfterMs: number): NextResponse {
  const retrySec = Math.ceil(retryAfterMs / 1000);
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retrySec),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

// ─── Preset limits ────────────────────────────────────────────────────────────
// Adjust these values to suit your traffic. Defaults are conservative but safe.

/** Strict: 10 attempts per 15 minutes — login / signup */
export const LIMITS = {
  AUTH: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** 30 bookings per minute per user — booking creation */
  BOOKING: { limit: 30, windowMs: 60 * 1000 },
  /** 60 searches per minute per IP — search endpoint */
  SEARCH: { limit: 60, windowMs: 60 * 1000 },
  /** 20 chat messages per minute per user/IP — Claude API calls are expensive */
  CHAT: { limit: 20, windowMs: 60 * 1000 },
  /** 100 general API requests per minute per IP */
  GENERAL: { limit: 100, windowMs: 60 * 1000 },
} as const;
