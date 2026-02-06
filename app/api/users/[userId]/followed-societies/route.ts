import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const followedSocieties = await prisma.societyFollower.findMany({
      where: { userId },
      include: {
        society: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const societies = followedSocieties.map((f) => f.society);

    return NextResponse.json(societies);
  } catch (error) {
    console.error('Error fetching followed societies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch followed societies' },
      { status: 500 }
    );
  }
}
