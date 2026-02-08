import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { adminId } = await request.json();

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [totalUsers, totalEvents, totalOrders, totalSocieties] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.order.count(),
      prisma.society.count(),
    ]);

    const orders = await prisma.order.findMany({ select: { totalAmount: true } });
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({
      totalUsers,
      totalEvents,
      totalOrders,
      totalSocieties,
      totalRevenue,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
