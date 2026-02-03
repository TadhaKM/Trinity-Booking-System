import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { societyId: string } }
) {
  try {
    const { societyId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const following = await prisma.societyFollower.findFirst({
      where: {
        userId,
        societyId,
      },
    });

    return NextResponse.json({ isFollowing: !!following });
  } catch (error) {
    console.error('Error checking following status:', error);
    return NextResponse.json(
      { error: 'Failed to check following status' },
      { status: 500 }
    );
  }
}
