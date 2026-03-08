/**
 * GET /api/organiser/[organiserId]/events/[eventId]/attendees
 *
 * Returns the attendee list for an event owned by the given organiser.
 * Supports JSON (default) and CSV export formats.
 * Supports optional filters: search (name/email), ticketTypeId, checkedIn status.
 *
 * Security hardening applied:
 *  - IP-based rate limiting — OWASP A07
 *  - Organiser ownership verified server-side via DB — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { buildAttendeesCsv, AttendeeRow } from '@/lib/csv-export';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organiserId: string; eventId: string }> }
) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('organiser:attendees', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { organiserId, eventId } = await params;
    const { searchParams } = request.nextUrl;

    const format = searchParams.get('format') ?? 'json';
    const search = searchParams.get('search') ?? '';
    const ticketTypeId = searchParams.get('ticketTypeId') ?? '';
    const checkedInParam = searchParams.get('checkedIn');

    // ── 2. Verify organiser owns this event ───────────────────────────────────
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, startDate: true, organiserId: true },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.organiserId !== organiserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 3. Fetch all orders with users, tickets, ticket types, check-in logs ──
    const orders = await prisma.order.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        tickets: {
          include: {
            ticketType: { select: { name: true } },
            checkInLog: true,
          },
        },
      },
    });

    // ── 4. Flatten to attendee rows and apply filters ─────────────────────────
    const attendeeRows: AttendeeRow[] = [];

    for (const order of orders) {
      for (const ticket of order.tickets) {
        const checkedIn = ticket.checkInLog !== null;
        const checkedInAt = ticket.checkInLog?.scannedAt
          ? ticket.checkInLog.scannedAt.toISOString()
          : null;

        // Filter: ticketTypeId
        if (ticketTypeId && ticket.ticketTypeId !== ticketTypeId) continue;

        // Filter: checkedIn status
        if (checkedInParam === 'true' && !checkedIn) continue;
        if (checkedInParam === 'false' && checkedIn) continue;

        // Filter: search (case-insensitive name or email)
        if (search) {
          const lc = search.toLowerCase();
          const nameMatch = order.user.name.toLowerCase().includes(lc);
          const emailMatch = order.user.email.toLowerCase().includes(lc);
          if (!nameMatch && !emailMatch) continue;
        }

        attendeeRows.push({
          name: order.user.name,
          email: order.user.email,
          ticketType: ticket.ticketType.name,
          ticketRef: ticket.id,
          orderRef: order.id,
          price: ticket.price,
          status: order.status,
          checkedIn,
          checkedInAt,
          purchasedAt: order.createdAt.toISOString(),
        });
      }
    }

    // ── 5. CSV export ─────────────────────────────────────────────────────────
    if (format === 'csv') {
      const csv = buildAttendeesCsv(attendeeRows);
      const dateStr = event.startDate.toISOString().slice(0, 10);
      const safeTitle = event.title.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 60);
      const filename = `attendees-${safeTitle}-${dateStr}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ── 6. JSON response with summary ─────────────────────────────────────────
    const totalOrders = orders.length;
    const totalTickets = attendeeRows.length;
    const checkedInCount = attendeeRows.filter((a) => a.checkedIn).length;
    const attendanceRate =
      totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;

    // Per-ticket-type summary (computed from full order set, not filtered rows)
    const ticketTypeMap = new Map<string, { name: string; sold: number; checkedIn: number }>();
    for (const order of orders) {
      for (const ticket of order.tickets) {
        const ttName = ticket.ticketType.name;
        const ttId = ticket.ticketTypeId;
        if (!ticketTypeMap.has(ttId)) {
          ticketTypeMap.set(ttId, { name: ttName, sold: 0, checkedIn: 0 });
        }
        const entry = ticketTypeMap.get(ttId)!;
        entry.sold += 1;
        if (ticket.checkInLog !== null) entry.checkedIn += 1;
      }
    }
    const byTicketType = Array.from(ticketTypeMap.values());

    // Enriched attendee objects for JSON (include userId)
    const attendeesJson = attendeeRows.map((row) => {
      const order = orders.find(
        (o) => o.id === row.orderRef
      );
      return {
        userId: order?.user.id ?? '',
        name: row.name,
        email: row.email,
        ticketType: row.ticketType,
        ticketRef: row.ticketRef,
        orderRef: row.orderRef,
        price: row.price,
        status: row.status,
        checkedIn: row.checkedIn,
        checkedInAt: row.checkedInAt,
        purchasedAt: row.purchasedAt,
      };
    });

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
      },
      summary: {
        totalOrders,
        totalTickets,
        checkedIn: checkedInCount,
        attendanceRate,
      },
      byTicketType,
      attendees: attendeesJson,
    });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 });
  }
}
