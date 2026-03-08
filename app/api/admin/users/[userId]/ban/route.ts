/**
 * POST   /api/admin/users/[userId]/ban  — ban a user
 * DELETE /api/admin/users/[userId]/ban  — unban a user
 *
 * Security hardening applied:
 *  - Rate-limited to LIMITS.ADMIN (20 req/min) — prevents enumeration — OWASP A05
 *  - Admin identity verified server-side via DB — OWASP A01
 *  - Admin-on-admin ban blocked — OWASP A01
 *  - Audit log written for every action — OWASP A09
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

// ─── POST — ban a user ────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('admin:ban', ip, LIMITS.ADMIN.limit, LIMITS.ADMIN.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Resolve route param ────────────────────────────────────────────────
    const { userId } = await params;

    // ── 3. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json();
    const { adminId, reason } = body as { adminId?: string; reason?: string };

    if (!adminId || typeof adminId !== 'string') {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    // ── 4. Verify admin identity ──────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 5. Fetch target user ──────────────────────────────────────────────────
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── 6. Block admin-on-admin ban ───────────────────────────────────────────
    if (target.isAdmin) {
      return NextResponse.json({ error: 'Cannot ban another admin' }, { status: 400 });
    }

    // ── 7. Apply ban ──────────────────────────────────────────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });

    // ── 8. Audit log ──────────────────────────────────────────────────────────
    await createAuditLog({
      actorId: adminId,
      action: 'BAN_USER',
      entityType: 'user',
      entityId: userId,
      details: JSON.stringify({ reason }),
    });

    // ── 9. Notify banned user (fire-and-forget) ───────────────────────────────
    await createNotification(
      userId,
      'BOOKING_CONFIRMED', // closest available generic type
      'Account suspended',
      'Your account has been suspended.'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin:ban POST] Error:', error);
    return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
  }
}

// ─── DELETE — unban a user ────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('admin:unban', ip, LIMITS.ADMIN.limit, LIMITS.ADMIN.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Resolve route param ────────────────────────────────────────────────
    const { userId } = await params;

    // ── 3. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json();
    const { adminId } = body as { adminId?: string };

    if (!adminId || typeof adminId !== 'string') {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    // ── 4. Verify admin identity ──────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 5. Fetch target user ──────────────────────────────────────────────────
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── 6. Remove ban ─────────────────────────────────────────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });

    // ── 7. Audit log ──────────────────────────────────────────────────────────
    await createAuditLog({
      actorId: adminId,
      action: 'UNBAN_USER',
      entityType: 'user',
      entityId: userId,
      details: JSON.stringify({}),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin:ban DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
  }
}
