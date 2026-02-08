import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { adminId } = await request.json();

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete related records first (tickets -> orders -> ticketTypes -> event)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        orders: { include: { tickets: true } },
        ticketTypes: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete all tickets for this event's orders
    for (const order of event.orders) {
      await prisma.ticket.deleteMany({ where: { orderId: order.id } });
    }

    // Delete all orders for this event
    await prisma.order.deleteMany({ where: { eventId } });

    // Delete ticket types and event (cascade should handle this but being explicit)
    await prisma.ticketType.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete event error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
