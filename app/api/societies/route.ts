/**
 * GET /api/societies
 *
 * Returns all societies enriched with:
 *  - followerCount + isFollowing (if userId provided)
 *  - featuredPost (pinned post or most recent) + likeCount + isLiked
 *  - upcomingEvent (next event with startDate >= now)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || undefined;

  try {
    // Base society data with counts + posts + events
    const societies = await prisma.society.findMany({
      include: {
        _count: { select: { followers: true } },
        posts: {
          include: {
            _count: { select: { likes: true } },
          },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
        events: {
          where: { startDate: { gte: new Date() } },
          orderBy: { startDate: 'asc' },
          take: 1,
          include: { ticketTypes: { select: { price: true, available: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    // If userId provided, fetch follow/like states in separate queries (avoids Prisma conditional include issues)
    let followingSet = new Set<string>();
    let likedPostSet = new Set<string>();

    if (userId) {
      const [follows, likes] = await Promise.all([
        prisma.societyFollower.findMany({
          where: { userId },
          select: { societyId: true },
        }),
        prisma.postLike.findMany({
          where: { userId },
          select: { postId: true },
        }),
      ]);
      followingSet = new Set(follows.map((f) => f.societyId));
      likedPostSet = new Set(likes.map((l) => l.postId));
    }

    const result = societies.map((s) => {
      const featuredPost = s.posts[0] ?? null;
      const upcomingEvent = s.events[0] ?? null;

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        imageUrl: s.imageUrl,
        followerCount: s._count.followers,
        isFollowing: followingSet.has(s.id),
        featuredPost: featuredPost
          ? {
              id: featuredPost.id,
              imageUrl: featuredPost.imageUrl,
              caption: featuredPost.caption,
              isPinned: featuredPost.isPinned,
              likeCount: featuredPost._count.likes,
              isLiked: likedPostSet.has(featuredPost.id),
              createdAt: featuredPost.createdAt,
            }
          : null,
        upcomingEvent: upcomingEvent
          ? {
              id: upcomingEvent.id,
              title: upcomingEvent.title,
              startDate: upcomingEvent.startDate,
              location: upcomingEvent.location,
              imageUrl: upcomingEvent.imageUrl,
              lowestPrice:
                upcomingEvent.ticketTypes.length > 0
                  ? Math.min(...upcomingEvent.ticketTypes.map((t) => t.price))
                  : 0,
              ticketsLeft: upcomingEvent.ticketTypes.reduce(
                (sum, t) => sum + t.available,
                0
              ),
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching societies:', error);
    return NextResponse.json({ error: 'Failed to fetch societies.' }, { status: 500 });
  }
}
