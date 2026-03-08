import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/checkin/verify
 * Validate a QR code and return ticket info without writing a check-in record.
 * Body: { qrCode: string; eventId: string; organiserId: string }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit('checkin:verify', ip, LIMITS.CHECKIN.limit, LIMITS.CHECKIN.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { qrCode, eventId, organiserId } = body as {
    qrCode?: string;
    eventId?: string;
    organiserId?: string;
  };

  if (!qrCode || !eventId || !organiserId) {
    return NextResponse.json({ error: 'qrCode, eventId, and organiserId are required' }, { status: 400 });
  }

  // Verify organiser owns this event
  const event = await prisma.event.findFirst({
    where: { id: eventId, organiserId },
  });
  if (!event) {
    return NextResponse.json({ error: 'Event not found or access denied' }, { status: 403 });
  }

  // Find the ticket by QR code
  const ticket = await prisma.ticket.findUnique({
    where: { qrCode },
    include: {
      order: { select: { userId: true, eventId: true } },
      ticketType: { select: { name: true, price: true } },
      checkInLog: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ valid: false, reason: 'Ticket not found' }, { status: 200 });
  }

  if (ticket.order.eventId !== eventId) {
    return NextResponse.json({ valid: false, reason: 'Ticket is for a different event' }, { status: 200 });
  }

  if (ticket.checkInLog) {
    return NextResponse.json({
      valid: false,
      reason: 'Already checked in',
      checkedInAt: ticket.checkInLog.scannedAt,
    }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    ticket: {
      id: ticket.id,
      ticketTypeName: ticket.ticketType.name,
      price: ticket.ticketType.price,
      userId: ticket.order.userId,
    },
  });
}
