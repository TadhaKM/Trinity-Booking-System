/**
 * POST   /api/push/subscribe  — register a push subscription
 * DELETE /api/push/subscribe  — remove a push subscription
 *
 * Security hardening applied:
 *  - Zod schema validation (PushSubscribeSchema) — enforces HTTPS endpoint, field limits — OWASP A03
 *  - Rate-limited to LIMITS.PUSH (5 changes/hour) — prevents subscription flooding — OWASP A05
 *  - DELETE verifies the subscription belongs to the requesting user — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { PushSubscribeSchema, zodErrors } from '@/lib/validation';

// ─── POST — save a push subscription ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('push:subscribe', ip, LIMITS.PUSH.limit, LIMITS.PUSH.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Validate body ──────────────────────────────────────────────────────
    const body = await request.json();
    const parsed = PushSubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { userId, endpoint, p256dh, auth } = parsed.data;

    // ── 3. Upsert subscription by endpoint ───────────────────────────────────
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push:subscribe POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }
}

// ─── DELETE — remove a push subscription ─────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('push:unsubscribe', ip, LIMITS.PUSH.limit, LIMITS.PUSH.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json();
    const { userId, endpoint } = body as { userId?: string; endpoint?: string };

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
    }

    // ── 3. Delete only if the subscription belongs to this user ──────────────
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push:subscribe DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to remove push subscription' }, { status: 500 });
  }
}
