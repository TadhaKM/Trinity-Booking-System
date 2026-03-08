import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/checkin/confirm
 * Write a CheckInLog record to mark the ticket as used.
 * Body: { qrCode: string; eventId: string; organiserId: string }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit('checkin:confirm', ip, LIMITS.CHECKIN.limit, LIMITS.CHECKIN.windowMs);
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

  // Find the ticket
  const ticket = await prisma.ticket.findUnique({
    where: { qrCode },
    include: {
      order: { select: { eventId: true } },
      checkInLog: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ success: false, reason: 'Ticket not found' }, { status: 404 });
  }

  if (ticket.order.eventId !== eventId) {
    return NextResponse.json({ success: false, reason: 'Ticket is for a different event' }, { status: 409 });
  }

  if (ticket.checkInLog) {
    return NextResponse.json({
      success: false,
      reason: 'Already checked in',
      checkedInAt: ticket.checkInLog.scannedAt,
    }, { status: 409 });
  }

  // Write the check-in log atomically
  const log = await prisma.$transaction(async (tx) => {
    const checkInLog = await tx.checkInLog.create({
      data: {
        ticketId: ticket.id,
        eventId,
        scannedBy: organiserId,
      },
    });
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { checkedInAt: checkInLog.scannedAt },
    });
    return checkInLog;
  });

  return NextResponse.json({ success: true, checkedInAt: log.scannedAt });
}
