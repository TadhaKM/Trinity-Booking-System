/**
 * GET  /api/events/[eventId]/comments  — paginated top-level comments with replies
 * POST /api/events/[eventId]/comments  — post a new comment or reply
 *
 * Security hardening applied:
 *  - IP-based rate limiting — OWASP A07
 *  - Zod schema validation (CreateCommentSchema) — OWASP A03
 *  - User ban check — OWASP A01
 *  - Content sanitization (stripHtml) — OWASP A03
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { CreateCommentSchema, zodErrors } from '@/lib/validation';
import { sanitizeComment } from '@/lib/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('comments:list', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { eventId } = await params;
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10) || 20;
    const limit = Math.min(50, Math.max(1, rawLimit));
    const skip = (page - 1) * limit;

    const comments = await prisma.eventComment.findMany({
      where: {
        eventId,
        parentId: null,
        isHidden: false,
      },
      include: {
        user: { select: { id: true, name: true, profilePicture: true } },
        replies: {
          where: { isHidden: false },
          include: {
            user: { select: { id: true, name: true, profilePicture: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.eventComment.count({
      where: { eventId, parentId: null, isHidden: false },
    });

    return NextResponse.json({ comments, total, page, limit });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('comments:create', ip, LIMITS.COMMENT.limit, LIMITS.COMMENT.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { eventId } = await params;

    // ── 2. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { userId, body: commentBody, parentId } = parsed.data;

    // ── 3. Sanitize comment body ──────────────────────────────────────────────
    const sanitizedBody = sanitizeComment(commentBody);

    // ── 4. Verify user exists and is not banned ───────────────────────────────
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 });
    }

    // ── 5. Verify event exists ────────────────────────────────────────────────
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // ── 6. If parentId provided: verify parent comment belongs to this event ──
    if (parentId) {
      const parentComment = await prisma.eventComment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
      if (parentComment.eventId !== eventId) {
        return NextResponse.json(
          { error: 'Parent comment does not belong to this event' },
          { status: 400 }
        );
      }
    }

    // ── 7. Create comment ─────────────────────────────────────────────────────
    const comment = await prisma.eventComment.create({
      data: {
        eventId,
        userId,
        parentId: parentId ?? null,
        body: sanitizedBody,
      },
      include: {
        user: { select: { id: true, name: true, profilePicture: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
