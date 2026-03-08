import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** GET /api/waitlist/status?userId=xxx&ticketTypeId=yyy — check waitlist position */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit('waitlist:status', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
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

  if (!entry) {
    return NextResponse.json({ onWaitlist: false });
  }

  const totalAhead = await prisma.waitlistEntry.count({
    where: { ticketTypeId, position: { lt: entry.position } },
  });

  return NextResponse.json({
    onWaitlist: true,
    position: entry.position,
    totalAhead,
    notified: entry.notified,
  });
}
