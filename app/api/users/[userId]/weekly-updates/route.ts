import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Get societies the user follows
    const followedSocieties = await prisma.societyFollower.findMany({
      where: { userId },
      include: { society: true },
    });

    // Get upcoming events for each followed society (next 7 days)
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const updates = await Promise.all(
      followedSocieties.map(async (follower) => {
        const events = await prisma.event.findMany({
          where: {
            societyId: follower.societyId,
            startDate: {
              gte: new Date(),
              lte: oneWeekFromNow,
            },
          },
          include: {
            society: true,
            ticketTypes: true,
          },
          orderBy: { startDate: 'asc' },
        });

        return {
          societyId: follower.societyId,
          societyName: follower.society.name,
          events,
        };
      })
    );

    return NextResponse.json(updates);
  } catch (error) {
    console.error('Error fetching weekly updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly updates' },
      { status: 500 }
    );
  }
}
