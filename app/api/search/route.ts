/**
 * GET /api/search
 *
 * Security hardening applied:
 *  - IP-based rate limiting (60 req/min) — OWASP A07
 *  - Zod query-param validation with length limits — OWASP A03
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { SearchSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('search', ip, LIMITS.SEARCH.limit, LIMITS.SEARCH.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  // ── 2. Validate query params ────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const parsed = SearchSchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    category: searchParams.get('category') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid search parameters.' }, { status: 400 });
  }

  const { q: query = '', category = '' } = parsed.data;

  try {
    const where: any = {
      startDate: { gte: new Date() },
    };

    if (category) {
      where.category = category;
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { location: { contains: query } },
        { tags: { contains: query.toLowerCase() } },
        { category: { contains: query } },
        {
          society: {
            name: { contains: query },
          },
        },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        society: true,
        ticketTypes: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(
      events.map((e) => ({
        ...e,
        tags: JSON.parse(e.tags),
        locationCoords: JSON.parse(e.locationCoords),
      }))
    );
  } catch (error) {
    console.error('Error searching events:', error);
    return NextResponse.json(
      { error: 'Failed to search events' },
      { status: 500 }
    );
  }
}
