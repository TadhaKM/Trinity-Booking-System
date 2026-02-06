import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const followedOnly = searchParams.get('followedOnly') === 'true';

    let events;

    if (followedOnly) {
      // Get events from followed societies only
      const followedSocieties = await prisma.societyFollower.findMany({
        where: { userId },
        select: { societyId: true },
      });

      const societyIds = followedSocieties.map((f) => f.societyId);

      events = await prisma.event.findMany({
        where: {
          societyId: { in: societyIds },
          startDate: { gte: new Date() },
        },
        include: {
          society: true,
          ticketTypes: true,
        },
        orderBy: { startDate: 'asc' },
      });
    } else {
      // Get all upcoming events
      events = await prisma.event.findMany({
        where: {
          startDate: { gte: new Date() },
        },
        include: {
          society: true,
          ticketTypes: true,
        },
        orderBy: { startDate: 'asc' },
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
