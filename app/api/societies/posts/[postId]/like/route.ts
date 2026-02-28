/**
 * POST /api/societies/posts/[postId]/like  — toggle like on a post
 *
 * Returns { liked: boolean, likeCount: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LikePostSchema, zodErrors } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  try {
    const body = await request.json();
    const parsed = LikePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { userId } = parsed.data;

    // Check existing like
    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.postLike.create({ data: { userId, postId } });
    }

    const likeCount = await prisma.postLike.count({ where: { postId } });

    return NextResponse.json({ liked: !existing, likeCount });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Failed to toggle like.' }, { status: 500 });
  }
}
