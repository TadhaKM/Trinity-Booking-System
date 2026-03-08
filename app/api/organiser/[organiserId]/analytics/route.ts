import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/organiser/[organiserId]/analytics
 * Extended analytics including check-in counts, daily revenue series,
 * coupon usage, no-show rate, and per-event data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organiserId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('organiser:analytics', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { organiserId } = await params;

  try {
  const events = await prisma.event.findMany({
    where: { organiserId },
    include: {
      ticketTypes: true,
      orders: {
        include: { tickets: { include: { checkInLog: true } } },
      },
      checkInLogs: true,
    },
    orderBy: { startDate: 'desc' },
  });

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalRevenue = events.reduce((s, ev) =>
    s + ev.orders.reduce((os, o) => os + o.totalAmount, 0), 0);

  const totalTicketsSold = events.reduce((s, ev) =>
    s + ev.orders.reduce((os, o) => os + o.tickets.length, 0), 0);

  const totalCheckedIn = events.reduce((s, ev) => s + ev.checkInLogs.length, 0);

  const upcomingEvents = events.filter((ev) => ev.startDate > new Date()).length;

  // ── Daily revenue (last 30 days) ──────────────────────────────────────────
  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  for (const ev of events) {
    for (const order of ev.orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(day)) {
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + order.totalAmount);
      }
    }
  }
  const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

  // ── Per-event stats ───────────────────────────────────────────────────────
  const eventStats = events.map((ev) => {
    const soldTickets = ev.orders.reduce((s, o) => s + o.tickets.length, 0);
    const revenue = ev.orders.reduce((s, o) => s + o.totalAmount, 0);
    const capacity = ev.ticketTypes.reduce((s, tt) => s + tt.quantity, 0);
    const checkedIn = ev.checkInLogs.length;
    const noShowCount = soldTickets - checkedIn;
    const noShowRate = soldTickets > 0 ? (noShowCount / soldTickets) * 100 : 0;

    return {
      id: ev.id,
      title: ev.title,
      startDate: ev.startDate.toISOString(),
      soldTickets,
      revenue,
      capacity,
      checkedIn,
      noShowRate: Math.round(noShowRate),
    };
  });

  return NextResponse.json({
    stats: {
      totalRevenue,
      totalTicketsSold,
      totalCheckedIn,
      upcomingEvents,
      totalEvents: events.length,
      noShowRate: totalTicketsSold > 0
        ? Math.round(((totalTicketsSold - totalCheckedIn) / totalTicketsSold) * 100)
        : 0,
    },
    events: eventStats,
    dailyRevenue,
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[analytics] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
