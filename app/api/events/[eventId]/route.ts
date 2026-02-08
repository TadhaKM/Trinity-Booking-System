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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const data = await request.json();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify organiser ownership
    if (event.organiserId !== data.organiserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Resolve society - if societyId matches existing, use it; otherwise create new
    let resolvedSocietyId = data.societyId;
    const existingSociety = await prisma.society.findUnique({
      where: { id: data.societyId },
    });

    if (!existingSociety) {
      const byName = await prisma.society.findFirst({
        where: { name: { equals: data.societyId } },
      });

      if (byName) {
        resolvedSocietyId = byName.id;
      } else {
        const newSociety = await prisma.society.create({
          data: {
            name: data.societyId.trim(),
            description: 'Society created by organiser',
            category: data.category || 'Other',
            imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=800',
            location: '{}',
          },
        });
        resolvedSocietyId = newSociety.id;
      }
    }

    // Update event fields
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        description: data.description,
        societyId: resolvedSocietyId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        location: data.location,
        locationCoords: data.locationCoords || '{}',
        category: data.category,
        imageUrl: data.imageUrl,
        tags: JSON.stringify(data.tags || []),
      },
    });

    // Update ticket types: delete removed ones, update existing, create new
    const existingIds = event.ticketTypes.map((tt) => tt.id);
    const incomingIds = (data.ticketTypes || [])
      .filter((tt: any) => tt.id)
      .map((tt: any) => tt.id);

    // Delete ticket types that were removed
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.ticketType.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    // Update or create ticket types
    for (const tt of data.ticketTypes || []) {
      if (tt.id && existingIds.includes(tt.id)) {
        await prisma.ticketType.update({
          where: { id: tt.id },
          data: {
            name: tt.name,
            price: tt.price,
            quantity: tt.quantity,
            available: tt.quantity,
          },
        });
      } else {
        await prisma.ticketType.create({
          data: {
            eventId,
            name: tt.name,
            price: tt.price,
            quantity: tt.quantity,
            available: tt.quantity,
          },
        });
      }
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}
