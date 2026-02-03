import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';

    const where: any = {
      startDate: { gte: new Date() },
    };

    if (category) {
      where.category = category;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { tags: { contains: query.toLowerCase() } },
        {
          society: {
            name: { contains: query, mode: 'insensitive' },
          },
        },
      ];
    }

    const events = await prisma.event.findMany({
      where,
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
    console.error('Error searching events:', error);
    return NextResponse.json(
      { error: 'Failed to search events' },
      { status: 500 }
    );
  }
}
