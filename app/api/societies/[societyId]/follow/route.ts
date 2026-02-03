import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { societyId: string } }
) {
  try {
    const { societyId } = params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if already following
    const existing = await prisma.societyFollower.findFirst({
      where: {
        userId,
        societyId,
      },
    });

    if (existing) {
      // Unfollow
      await prisma.societyFollower.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ following: false });
    } else {
      // Follow
      await prisma.societyFollower.create({
        data: {
          userId,
          societyId,
        },
      });
      return NextResponse.json({ following: true });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return NextResponse.json(
      { error: 'Failed to toggle follow' },
      { status: 500 }
    );
  }
}
