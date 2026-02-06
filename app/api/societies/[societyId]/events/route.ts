import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;

    const events = await prisma.event.findMany({
      where: {
        societyId,
        startDate: { gte: new Date() },
      },
      include: {
        society: true,
        ticketTypes: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(
      events.map((e) => ({
        ...e,
        tags: JSON.parse(e.tags),
        locationCoords: JSON.parse(e.locationCoords),
      }))
    );
  } catch (error) {
    console.error('Error fetching society events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch society events' },
      { status: 500 }
    );
  }
}
