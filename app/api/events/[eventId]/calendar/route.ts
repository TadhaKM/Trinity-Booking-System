import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateICS } from '@/lib/utils';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** GET /api/events/[eventId]/calendar — download ICS file for an event */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('calendar:ics', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const ics = generateICS({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
  });

  const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
}
