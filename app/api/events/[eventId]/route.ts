import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        society: true,
        ticketTypes: {
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Safely parse JSON fields
    let tags: string[] = [];
    let locationCoords: any = null;

    try {
      tags = event.tags ? JSON.parse(event.tags) : [];
    } catch {
      tags = [];
    }

    try {
      locationCoords = event.locationCoords ? JSON.parse(event.locationCoords) : null;
    } catch {
      locationCoords = null;
    }

    return NextResponse.json({
      ...event,
      tags,
      locationCoords,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
