/**
 * PATCH /api/admin/events/[eventId]/moderate
 *
 * Admin moderation: publish, unpublish, or cancel an event.
 * On CANCEL: notifies all users who have confirmed orders for the event.
 *
 * Security hardening applied:
 *  - Rate-limited to LIMITS.ADMIN (20 req/min) — OWASP A05
 *  - Admin identity verified server-side via DB — OWASP A01
 *  - Action enum validated — rejects unknown verbs — OWASP A03
 *  - Audit log written for every action — OWASP A09
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

type ModerateAction = 'PUBLISH' | 'UNPUBLISH' | 'CANCEL';

const VALID_ACTIONS: ModerateAction[] = ['PUBLISH', 'UNPUBLISH', 'CANCEL'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('admin:moderate-event', ip, LIMITS.ADMIN.limit, LIMITS.ADMIN.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Resolve route param ────────────────────────────────────────────────
    const { eventId } = await params;

    // ── 3. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json();
    const {
      adminId,
      action,
      reason,
    } = body as { adminId?: string; action?: string; reason?: string };

    if (!adminId || typeof adminId !== 'string') {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }
    if (!action || !VALID_ACTIONS.includes(action as ModerateAction)) {
      return NextResponse.json(
        { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const moderateAction = action as ModerateAction;

    // ── 4. Verify admin identity ──────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 5. Fetch event ────────────────────────────────────────────────────────
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // ── 6. Apply moderation action ────────────────────────────────────────────
    const updateData: Record<string, unknown> = {};
    if (moderateAction === 'PUBLISH') {
      updateData.isPublished = true;
    } else if (moderateAction === 'UNPUBLISH') {
      updateData.isPublished = false;
    } else if (moderateAction === 'CANCEL') {
      updateData.isCancelled = true;
    }

    await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    // ── 7. Audit log ──────────────────────────────────────────────────────────
    await createAuditLog({
      actorId: adminId,
      action: 'MODERATE_EVENT',
      entityType: 'event',
      entityId: eventId,
      details: JSON.stringify({ action: moderateAction, reason }),
    });

    // ── 8. On CANCEL: notify all users with confirmed orders ──────────────────
    if (moderateAction === 'CANCEL') {
      const orders = await prisma.order.findMany({
        where: { eventId, status: 'CONFIRMED' },
        select: { userId: true },
      });

      // Deduplicate user IDs (a user may have multiple orders)
      const userIds = [...new Set(orders.map((o) => o.userId))];

      await Promise.all(
        userIds.map((uid) =>
          createNotification(
            uid,
            'EVENT_CANCELLED',
            'Event cancelled',
            `Event cancelled: ${event.title}`,
            `/events/${eventId}`
          )
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin:moderate-event PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to moderate event' }, { status: 500 });
  }
}
