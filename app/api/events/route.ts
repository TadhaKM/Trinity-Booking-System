import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
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
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
