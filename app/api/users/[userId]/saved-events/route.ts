import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** GET /api/users/[userId]/saved-events — fetch all events saved by a user */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('saved:list', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { userId } = await params;

  const savedEvents = await prisma.savedEvent.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          society: { select: { id: true, name: true } },
          ticketTypes: { select: { id: true, price: true, available: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const events = savedEvents.map((se) => ({
    savedAt: se.createdAt,
    event: {
      ...se.event,
      tags: JSON.parse(se.event.tags || '[]'),
      locationCoords: JSON.parse(se.event.locationCoords || '{}'),
    },
  }));

  return NextResponse.json(events);
}
