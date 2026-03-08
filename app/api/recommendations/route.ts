/**
 * GET /api/recommendations
 *
 * Personalised event recommendations with three strategies:
 *  1. Similar events  — if `eventId` is provided
 *  2. Personalised    — if `userId` is provided (followed societies + category affinity, merged)
 *  3. Trending        — fallback when neither param is present
 *
 * Security hardening applied:
 *  - Rate-limited to LIMITS.GENERAL (100 req/min per IP) — OWASP A05
 *  - userId / eventId are untrusted strings; DB queries use parameterised Prisma calls — OWASP A03
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import {
  getSimilarEvents,
  getFollowedSocietyEvents,
  getCategoryAffinityEvents,
  getTrendingEvents,
} from '@/lib/recommendations';

// ─── Shape helper ─────────────────────────────────────────────────────────────

function shapeEvent(event: Record<string, unknown>, reason: string) {
  let tags: unknown[] = [];
  try {
    tags = JSON.parse((event.tags as string) || '[]');
  } catch {
    tags = [];
  }

  let locationCoords: unknown = null;
  try {
    locationCoords = JSON.parse((event.locationCoords as string) || 'null');
  } catch {
    locationCoords = null;
  }

  return {
    ...event,
    tags,
    locationCoords,
    reason,
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('recommendations', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Parse query params ─────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ?? undefined;
    const eventId = searchParams.get('eventId') ?? undefined;

    // ── 3. Strategy: similar events ───────────────────────────────────────────
    if (eventId) {
      const similar = await getSimilarEvents(eventId);
      const events = similar.map((e) =>
        shapeEvent(e as unknown as Record<string, unknown>, 'Similar event')
      );
      return NextResponse.json({ events });
    }

    // ── 4. Strategy: personalised for user ────────────────────────────────────
    if (userId) {
      const [societyEvents, affinityEvents] = await Promise.all([
        getFollowedSocietyEvents(userId),
        getCategoryAffinityEvents(userId),
      ]);

      // Merge and deduplicate by event ID, preserving reason label
      const seen = new Set<string>();
      const merged: ReturnType<typeof shapeEvent>[] = [];

      for (const e of societyEvents) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          merged.push(shapeEvent(e as unknown as Record<string, unknown>, 'From a society you follow'));
        }
      }
      for (const e of affinityEvents) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          merged.push(shapeEvent(e as unknown as Record<string, unknown>, 'Based on your interests'));
        }
      }

      return NextResponse.json({ events: merged.slice(0, 12) });
    }

    // ── 5. Strategy: trending (fallback) ──────────────────────────────────────
    const trending = await getTrendingEvents();
    const events = trending.map((e) =>
      shapeEvent(e as unknown as Record<string, unknown>, 'Trending this week')
    );
    return NextResponse.json({ events });
  } catch (error) {
    console.error('[recommendations GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
