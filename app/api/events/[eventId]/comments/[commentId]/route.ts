/**
 * DELETE /api/events/[eventId]/comments/[commentId]  — delete a comment
 * PATCH  /api/events/[eventId]/comments/[commentId]  — hide/unhide or edit a comment
 *
 * Security hardening applied:
 *  - IP-based rate limiting — OWASP A07
 *  - Ownership + admin/organiser checks for all mutations — OWASP A01
 *  - Content sanitization on edit — OWASP A03
 *  - Audit log for hide/unhide actions — OWASP A09
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { sanitizeComment } from '@/lib/sanitize';
import { createAuditLog } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; commentId: string }> }
) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('comments:delete', ip, LIMITS.COMMENT.limit, LIMITS.COMMENT.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { eventId, commentId } = await params;

    const body = await request.json();
    const userId: string | undefined = body?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // ── 2. Find comment and verify it belongs to this event ───────────────────
    const comment = await prisma.eventComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment.eventId !== eventId) {
      return NextResponse.json({ error: 'Comment does not belong to this event' }, { status: 400 });
    }

    // ── 3. Verify requester: owner, admin, or event organiser ─────────────────
    const isOwner = comment.userId === userId;

    let isAdmin = false;
    let isOrganiser = false;

    if (!isOwner) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      isAdmin = user.isAdmin;

      if (!isAdmin) {
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        isOrganiser = event?.organiserId === userId;
      }

      if (!isAdmin && !isOrganiser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // ── 4. Hard delete (Prisma cascades to replies) ───────────────────────────
    await prisma.eventComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; commentId: string }> }
) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('comments:patch', ip, LIMITS.COMMENT.limit, LIMITS.COMMENT.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { eventId, commentId } = await params;

    const body = await request.json();
    const userId: string | undefined = body?.userId;
    const isHidden: boolean | undefined = body?.isHidden;
    const newBody: string | undefined = body?.body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (isHidden === undefined && newBody === undefined) {
      return NextResponse.json(
        { error: 'At least one of isHidden or body must be provided' },
        { status: 400 }
      );
    }

    // ── 2. Find comment and verify it belongs to this event ───────────────────
    const comment = await prisma.eventComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment.eventId !== eventId) {
      return NextResponse.json({ error: 'Comment does not belong to this event' }, { status: 400 });
    }

    // ── 3. Handle hide/unhide (admin or event organiser only) ─────────────────
    if (isHidden !== undefined) {
      const actor = await prisma.user.findUnique({ where: { id: userId } });
      if (!actor) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isAdmin = actor.isAdmin;
      let isOrganiser = false;
      if (!isAdmin) {
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        isOrganiser = event?.organiserId === userId;
      }

      if (!isAdmin && !isOrganiser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const updated = await prisma.eventComment.update({
        where: { id: commentId },
        data: { isHidden },
        include: { user: { select: { id: true, name: true, profilePicture: true } } },
      });

      await createAuditLog({
        actorId: userId,
        action: isHidden ? 'HIDE_COMMENT' : 'UNHIDE_COMMENT',
        entityType: 'comment',
        entityId: commentId,
        details: JSON.stringify({ eventId }),
      });

      return NextResponse.json(updated);
    }

    // ── 4. Handle body edit (comment owner only) ──────────────────────────────
    if (newBody !== undefined) {
      if (comment.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const sanitizedBody = sanitizeComment(newBody);

      const updated = await prisma.eventComment.update({
        where: { id: commentId },
        data: { body: sanitizedBody },
        include: { user: { select: { id: true, name: true, profilePicture: true } } },
      });

      return NextResponse.json(updated);
    }

    // Should not be reached
    return NextResponse.json({ error: 'No valid operation provided' }, { status: 400 });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}
