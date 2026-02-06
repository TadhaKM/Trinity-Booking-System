import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organiserId: string }> }
) {
  try {
    const { organiserId } = await params;

    // Get all events created by this organiser
    const events = await prisma.event.findMany({
      where: { organiserId },
      include: {
        ticketTypes: true,
        orders: {
          include: {
            tickets: true,
          },
        },
      },
    });

    // Calculate stats
    const totalRevenue = events.reduce((sum, event) => {
      const eventRevenue = event.orders.reduce(
        (orderSum, order) => orderSum + order.totalAmount,
        0
      );
      return sum + eventRevenue;
    }, 0);

    const totalTicketsSold = events.reduce((sum, event) => {
      const eventTickets = event.orders.reduce(
        (ticketSum, order) => ticketSum + order.tickets.length,
        0
      );
      return sum + eventTickets;
    }, 0);

    const upcomingEvents = events.filter(
      (event) => event.startDate > new Date()
    ).length;

    const stats = {
      totalRevenue,
      totalTicketsSold,
      upcomingEvents,
      totalEvents: events.length,
    };

    // Calculate per-event stats
    const eventStats = events.map((event) => {
      const ticketsSold = event.orders.reduce(
        (sum, order) => sum + order.tickets.length,
        0
      );
      const revenue = event.orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );
      const capacity = event.ticketTypes.reduce(
        (sum, tt) => sum + tt.quantity,
        0
      );

      return {
        id: event.id,
        title: event.title,
        ticketsSold,
        revenue,
        capacity,
      };
    });

    return NextResponse.json({ stats, events: eventStats });
  } catch (error) {
    console.error('Error fetching organiser dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}
