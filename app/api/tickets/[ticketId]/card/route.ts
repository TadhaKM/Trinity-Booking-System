import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = rateLimit('ticket:card', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { ticketId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: true,
        order: {
          include: {
            event: {
              include: {
                society: {
                  select: { id: true, name: true, category: true, imageUrl: true },
                },
              },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Ownership check — the order must belong to the requesting user
    if (ticket.order.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket card data:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}
