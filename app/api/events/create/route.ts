import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      title,
      description,
      societyId,
      startDate,
      endDate,
      location,
      category,
      imageUrl,
      tags,
      ticketTypes,
      organiserId,
    } = data;

    // Get society location for event coordinates
    const society = await prisma.society.findUnique({
      where: { id: societyId },
    });

    if (!society) {
      return NextResponse.json(
        { error: 'Society not found' },
        { status: 404 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        societyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        locationCoords: society.location,
        category,
        imageUrl,
        tags,
        organiserId,
        ticketTypes: {
          create: ticketTypes.map((tt: any) => ({
            name: tt.name,
            price: parseFloat(tt.price),
            quantity: parseInt(tt.quantity),
            available: parseInt(tt.quantity),
          })),
        },
      },
      include: {
        ticketTypes: true,
        society: true,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
