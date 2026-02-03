import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, location } = await request.json();

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Find events at the same location that overlap with the proposed time
    const conflicts = await prisma.event.findMany({
      where: {
        location,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        location: true,
      },
    });

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to check conflicts' },
      { status: 500 }
    );
  }
}
