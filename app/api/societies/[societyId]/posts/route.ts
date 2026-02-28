/**
 * GET  /api/societies/[societyId]/posts  — list all posts for a society
 * POST /api/societies/[societyId]/posts  — create a new promotional post
 *
 * Security: POST verifies the organiser has created events for this society (or isAdmin).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreatePostSchema, zodErrors } from '@/lib/validation';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  const { societyId } = await params;

  try {
    const posts = await prisma.societyPost.findMany({
      where: { societyId },
      include: {
        _count: { select: { likes: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(
      posts.map((p) => ({
        id: p.id,
        societyId: p.societyId,
        imageUrl: p.imageUrl,
        caption: p.caption,
        isPinned: p.isPinned,
        likeCount: p._count.likes,
        event: p.event,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('posts:create', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { societyId } = await params;

  try {
    const body = await request.json();
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { organiserId, imageUrl, caption, eventId } = parsed.data;

    // Verify organiser permission: must be admin or have an event for this society
    const organiser = await prisma.user.findUnique({ where: { id: organiserId } });
    if (!organiser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!organiser.isAdmin) {
      if (!organiser.isOrganiser) {
        return NextResponse.json({ error: 'Not authorised to post.' }, { status: 403 });
      }
      const hasEvent = await prisma.event.findFirst({
        where: { organiserId, societyId },
      });
      if (!hasEvent) {
        return NextResponse.json(
          { error: 'You can only post for societies where you have organised events.' },
          { status: 403 }
        );
      }
    }

    const post = await prisma.societyPost.create({
      data: {
        societyId,
        imageUrl,
        caption,
        eventId: eventId || null,
        isPinned: false,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post.' }, { status: 500 });
  }
}
