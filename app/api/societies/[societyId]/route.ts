import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { societyId: string } }
) {
  try {
    const { societyId } = params;

    const society = await prisma.society.findUnique({
      where: { id: societyId },
    });

    if (!society) {
      return NextResponse.json(
        { error: 'Society not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(society);
  } catch (error) {
    console.error('Error fetching society:', error);
    return NextResponse.json(
      { error: 'Failed to fetch society' },
      { status: 500 }
    );
  }
}
