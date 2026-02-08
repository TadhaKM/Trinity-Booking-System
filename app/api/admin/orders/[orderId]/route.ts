import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { adminId } = await request.json();

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tickets: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Restore ticket availability
    for (const ticket of order.tickets) {
      await prisma.ticketType.update({
        where: { id: ticket.ticketTypeId },
        data: { available: { increment: 1 } },
      });
    }

    // Delete tickets then order
    await prisma.ticket.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { adminId, status } = await request.json();

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
