/**
 * GET /api/societies/leaderboard
 *
 * Society leaderboards — by follower count and/or ticket sales this month.
 *
 * Query params:
 *  - type: 'followers' | 'tickets' | 'both'  (default: 'both')
 *
 * Security hardening applied:
 *  - Rate-limited to LIMITS.GENERAL (100 req/min per IP) — OWASP A05
 *  - type param validated against an allowlist — OWASP A03
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { getSocietyLeaderboard, getTopTicketSocieties } from '@/lib/recommendations';

type LeaderboardType = 'followers' | 'tickets' | 'both';

const VALID_TYPES: LeaderboardType[] = ['followers', 'tickets', 'both'];

export async function GET(request: NextRequest) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('societies:leaderboard', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Parse query params ─────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') ?? 'both';

    const type: LeaderboardType = VALID_TYPES.includes(typeParam as LeaderboardType)
      ? (typeParam as LeaderboardType)
      : 'both';

    // ── 3. Fetch leaderboard data ─────────────────────────────────────────────
    const [byFollowers, byTickets] = await Promise.all([
      type === 'tickets' ? Promise.resolve([]) : getSocietyLeaderboard(),
      type === 'followers' ? Promise.resolve([]) : getTopTicketSocieties(),
    ]);

    return NextResponse.json({ byFollowers, byTickets });
  } catch (error) {
    console.error('[societies:leaderboard GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
