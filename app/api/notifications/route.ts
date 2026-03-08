import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

/** GET /api/notifications?userId=xxx — fetch latest 40 notifications */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit('notifications:get', ip, LIMITS.NOTIFICATION.limit, LIMITS.NOTIFICATION.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unreadCount });
}
