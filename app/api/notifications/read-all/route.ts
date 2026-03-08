import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** PATCH /api/notifications/read-all — mark all notifications as read for a user */
export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit('notifications:read-all', ip, LIMITS.NOTIFICATION.limit, LIMITS.NOTIFICATION.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string | undefined;

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
