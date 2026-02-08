import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { adminId } = await request.json();

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { title: true } },
        tickets: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      userName: o.user.name,
      userEmail: o.user.email,
      eventTitle: o.event.title,
      ticketCount: o.tickets.length,
      totalAmount: o.totalAmount,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
