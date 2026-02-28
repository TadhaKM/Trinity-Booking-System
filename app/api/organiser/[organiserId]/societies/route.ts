import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organiserId: string }> }
) {
  try {
    const { organiserId } = await params;

    // Check if admin — admins get all societies
    const user = await prisma.user.findUnique({ where: { id: organiserId } });
    if (user?.isAdmin) {
      const societies = await prisma.society.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(societies);
    }

    // Organiser: return only societies where they have created events
    const events = await prisma.event.findMany({
      where: { organiserId },
      select: { societyId: true },
      distinct: ['societyId'],
    });
    const societyIds = events.map((e) => e.societyId);
    const societies = societyIds.length > 0
      ? await prisma.society.findMany({
          where: { id: { in: societyIds } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [];

    return NextResponse.json(societies);
  } catch (error) {
    console.error('Error fetching societies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch societies' },
      { status: 500 }
    );
  }
}
