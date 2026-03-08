import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** PATCH /api/notifications/[id]/read — mark a notification as read */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('notifications:read', ip, LIMITS.NOTIFICATION.limit, LIMITS.NOTIFICATION.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string | undefined;

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (notification.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.notification.update({ where: { id }, data: { read: true } });
  return NextResponse.json({ success: true });
}
