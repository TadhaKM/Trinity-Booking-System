/**
 * PATCH /api/societies/posts/[postId]  — pin or unpin a post
 *
 * Unpins all other posts for the society first, then sets isPinned on this one.
 * Verifies organiser owns this society (has an event there) or is admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PinPostSchema, zodErrors } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  try {
    const body = await request.json();
    const parsed = PinPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { organiserId, isPinned } = parsed.data;

    // Fetch post to verify ownership
    const post = await prisma.societyPost.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const organiser = await prisma.user.findUnique({ where: { id: organiserId } });
    if (!organiser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!organiser.isAdmin) {
      const hasEvent = await prisma.event.findFirst({
        where: { organiserId, societyId: post.societyId },
      });
      if (!hasEvent) {
        return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
      }
    }

    // If pinning: unpin all other posts for this society first
    if (isPinned) {
      await prisma.societyPost.updateMany({
        where: { societyId: post.societyId, isPinned: true },
        data: { isPinned: false },
      });
    }

    const updated = await prisma.societyPost.update({
      where: { id: postId },
      data: { isPinned },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post.' }, { status: 500 });
  }
}
