import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** POST /api/waitlist/join — join the waitlist for a sold-out ticket type */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit('waitlist:join', ip, LIMITS.WAITLIST.limit, LIMITS.WAITLIST.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { userId, ticketTypeId, eventId } = body as {
    userId?: string;
    ticketTypeId?: string;
    eventId?: string;
  };

  if (!userId || !ticketTypeId || !eventId) {
    return NextResponse.json({ error: 'userId, ticketTypeId and eventId are required' }, { status: 400 });
  }

  // Verify the ticket type exists and actually belongs to this event
  const ticketType = await prisma.ticketType.findFirst({
    where: { id: ticketTypeId, eventId },
  });
  if (!ticketType) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });

  // Don't join if still available
  if (ticketType.available > 0) {
    return NextResponse.json({ error: 'Tickets are still available — no need to join the waitlist' }, { status: 409 });
  }

  // Already on waitlist?
  const existing = await prisma.waitlistEntry.findUnique({
    where: { userId_ticketTypeId: { userId, ticketTypeId } },
  });
  if (existing) {
    return NextResponse.json({ entry: existing, alreadyJoined: true });
  }

  // Get next position
  const last = await prisma.waitlistEntry.findFirst({
    where: { ticketTypeId },
    orderBy: { position: 'desc' },
  });
  const position = (last?.position ?? 0) + 1;

  const entry = await prisma.waitlistEntry.create({
    data: { userId, ticketTypeId, eventId, position, notified: false },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
