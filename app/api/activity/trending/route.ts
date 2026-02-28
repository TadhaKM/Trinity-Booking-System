/**
 * GET /api/activity/trending
 * Returns recent activity for the trending ticker.
 * Uses real data from DB when available, falls back to simulated demo data.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface ActivityItem {
  id: string;
  type: 'booking' | 'viewing' | 'soldout' | 'newfollow';
  message: string;
  timestamp: string;
}

export async function GET() {
  try {
    const activities: ActivityItem[] = [];

    // Try to get real recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { title: true } },
        tickets: true,
      },
    });

    if (recentOrders.length > 0) {
      for (const order of recentOrders) {
        activities.push({
          id: order.id,
          type: 'booking',
          message: `${order.tickets.length} ticket${order.tickets.length > 1 ? 's' : ''} just booked for "${order.event.title}"`,
          timestamp: order.createdAt.toISOString(),
        });
      }
    }

    // Try to get recent society follows
    const recentFollows = await prisma.societyFollower.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { society: { select: { name: true } } },
    });

    for (const follow of recentFollows) {
      activities.push({
        id: follow.id,
        type: 'newfollow',
        message: `Someone just followed "${follow.society.name}"`,
        timestamp: follow.createdAt.toISOString(),
      });
    }

    // If we have real data, return it
    if (activities.length > 0) {
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return NextResponse.json({ activities, isSimulated: false });
    }

    // Otherwise return simulated demo data
    const now = new Date();
    const simulated: ActivityItem[] = [
      { id: 's1', type: 'booking', message: '3 tickets just booked for "Jazz Night at the Pav"', timestamp: new Date(now.getTime() - 120000).toISOString() },
      { id: 's2', type: 'viewing', message: '15 people viewing "Sports Day 2026"', timestamp: new Date(now.getTime() - 300000).toISOString() },
      { id: 's3', type: 'newfollow', message: '4 new followers for "DU Players"', timestamp: new Date(now.getTime() - 600000).toISOString() },
      { id: 's4', type: 'booking', message: '2 tickets sold for "Debate Finals"', timestamp: new Date(now.getTime() - 900000).toISOString() },
      { id: 's5', type: 'soldout', message: '"Film Society Screening" is almost sold out!', timestamp: new Date(now.getTime() - 1200000).toISOString() },
      { id: 's6', type: 'viewing', message: '28 people viewing "Trinity Ball 2026"', timestamp: new Date(now.getTime() - 1500000).toISOString() },
      { id: 's7', type: 'newfollow', message: '6 new followers for "Hist Society"', timestamp: new Date(now.getTime() - 1800000).toISOString() },
      { id: 's8', type: 'booking', message: '5 tickets just booked for "Freshers\' Week Kickoff"', timestamp: new Date(now.getTime() - 2100000).toISOString() },
    ];

    return NextResponse.json({ activities: simulated, isSimulated: true });
  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json({ activities: [], isSimulated: true });
  }
}
