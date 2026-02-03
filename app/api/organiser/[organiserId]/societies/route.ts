import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { organiserId: string } }
) {
  try {
    // For this demo, return all societies
    // In a real app, you'd filter by organiser permissions
    const societies = await prisma.society.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(societies);
  } catch (error) {
    console.error('Error fetching societies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch societies' },
      { status: 500 }
    );
  }
}
