import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** DELETE /api/waitlist/leave — leave the waitlist for a ticket type */
export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit('waitlist:leave', ip, LIMITS.WAITLIST.limit, LIMITS.WAITLIST.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const ticketTypeId = searchParams.get('ticketTypeId');

  if (!userId || !ticketTypeId) {
    return NextResponse.json({ error: 'userId and ticketTypeId are required' }, { status: 400 });
  }

  const entry = await prisma.waitlistEntry.findUnique({
    where: { userId_ticketTypeId: { userId, ticketTypeId } },
  });
  if (!entry) return NextResponse.json({ error: 'Not on waitlist' }, { status: 404 });

  await prisma.waitlistEntry.delete({
    where: { userId_ticketTypeId: { userId, ticketTypeId } },
  });

  // Re-number remaining positions so they stay contiguous
  const remaining = await prisma.waitlistEntry.findMany({
    where: { ticketTypeId, position: { gt: entry.position } },
    orderBy: { position: 'asc' },
  });
  for (let i = 0; i < remaining.length; i++) {
    await prisma.waitlistEntry.update({
      where: { id: remaining[i].id },
      data: { position: entry.position + i },
    });
  }

  return NextResponse.json({ success: true });
}
