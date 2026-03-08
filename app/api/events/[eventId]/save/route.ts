import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** POST /api/events/[eventId]/save — save (bookmark) an event */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('save:toggle', ip, LIMITS.SAVE.limit, LIMITS.SAVE.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const userId = body?.userId as string | undefined;

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const existing = await prisma.savedEvent.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) {
    return NextResponse.json({ saved: true, alreadySaved: true });
  }

  const savedEvent = await prisma.savedEvent.create({
    data: { userId, eventId },
  });

  return NextResponse.json({ saved: true, savedEvent }, { status: 201 });
}

/** DELETE /api/events/[eventId]/save — unsave (unbookmark) an event */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('save:toggle', ip, LIMITS.SAVE.limit, LIMITS.SAVE.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { eventId } = await params;
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const existing = await prisma.savedEvent.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (!existing) return NextResponse.json({ error: 'Not saved' }, { status: 404 });

  await prisma.savedEvent.delete({
    where: { userId_eventId: { userId, eventId } },
  });

  return NextResponse.json({ saved: false });
}

/** GET /api/events/[eventId]/save?userId=xxx — check if user has saved this event */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('save:check', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { eventId } = await params;
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const saved = await prisma.savedEvent.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  return NextResponse.json({ saved: !!saved });
}
