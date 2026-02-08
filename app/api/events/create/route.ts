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

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Event title is required' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Event description is required' },
        { status: 400 }
      );
    }

    if (!societyId) {
      return NextResponse.json(
        { error: 'Please select a society for this event' },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      );
    }

    if (!location || !location.trim()) {
      return NextResponse.json(
        { error: 'Event location is required' },
        { status: 400 }
      );
    }

    if (!ticketTypes || ticketTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one ticket type is required' },
        { status: 400 }
      );
    }

    if (!organiserId) {
      return NextResponse.json(
        { error: 'Organiser ID is required. Please log in again.' },
        { status: 400 }
      );
    }

    // Validate ticket types
    for (let i = 0; i < ticketTypes.length; i++) {
      const tt = ticketTypes[i];
      if (!tt.name || !tt.name.trim()) {
        return NextResponse.json(
          { error: `Ticket type ${i + 1}: Name is required` },
          { status: 400 }
        );
      }
      if (tt.quantity <= 0) {
        return NextResponse.json(
          { error: `Ticket type "${tt.name}": Quantity must be at least 1` },
          { status: 400 }
        );
      }
      if (tt.price < 0) {
        return NextResponse.json(
          { error: `Ticket type "${tt.name}": Price cannot be negative` },
          { status: 400 }
        );
      }
    }

    // Get society - if societyId matches an existing society, use it.
    // Otherwise, treat it as a custom society name and create a new one.
    let society = await prisma.society.findUnique({
      where: { id: societyId },
    });

    let resolvedSocietyId = societyId;

    if (!society) {
      // Try to find by name (case-insensitive)
      const existingByName = await prisma.society.findFirst({
        where: { name: { equals: societyId } },
      });

      if (existingByName) {
        society = existingByName;
        resolvedSocietyId = existingByName.id;
      } else {
        // Create a new society with the custom name
        society = await prisma.society.create({
          data: {
            name: societyId.trim(),
            description: `Society created by organiser`,
            category: category || 'Other',
            imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=800',
            location: '{}',
          },
        });
        resolvedSocietyId = society.id;
      }
    }

    // Verify organiser exists
    const organiser = await prisma.user.findUnique({
      where: { id: organiserId },
    });

    if (!organiser) {
      return NextResponse.json(
        { error: 'Your account was not found. Please log in again.' },
        { status: 404 }
      );
    }

    if (!organiser.isOrganiser) {
      return NextResponse.json(
        { error: 'You do not have permission to create events. Please contact support.' },
        { status: 403 }
      );
    }

    // Ensure tags is a JSON string
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]');

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        societyId: resolvedSocietyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        location: location.trim(),
        locationCoords: society.location,
        category: category || 'Arts & Culture',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        tags: tagsJson,
        organiserId,
        ticketTypes: {
          create: ticketTypes.map((tt: any) => ({
            name: tt.name.trim(),
            price: parseFloat(tt.price) || 0,
            quantity: parseInt(tt.quantity) || 1,
            available: parseInt(tt.quantity) || 1,
          })),
        },
      },
      include: {
        ticketTypes: true,
        society: true,
      },
    });

    return NextResponse.json(event);
  } catch (error: any) {
    console.error('Error creating event:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An event with this information already exists.' },
        { status: 400 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference: The society or organiser does not exist.' },
        { status: 400 }
      );
    }

    // Return the actual error message for debugging
    const errorMessage = error.message || 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create event: ${errorMessage}` },
      { status: 500 }
    );
  }
}
