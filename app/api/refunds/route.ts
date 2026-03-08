/**
 * POST /api/refunds  — submit a new refund request
 * GET  /api/refunds?userId=xxx  — list refund requests for a user
 *
 * Security hardening applied:
 *  - IP-based rate limiting — OWASP A07
 *  - Zod schema validation (CreateRefundRequestSchema) — OWASP A03
 *  - User ban check and ownership verification — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { CreateRefundRequestSchema, zodErrors } from '@/lib/validation';

export async function POST(request: NextRequest) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('refunds:create', ip, LIMITS.REFUND.limit, LIMITS.REFUND.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    // ── 2. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = CreateRefundRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { userId, orderId, ticketId, reason } = parsed.data;

    // ── 3. Verify user exists and is not banned ───────────────────────────────
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 });
    }

    // ── 4. Find order and verify ownership ───────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tickets: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 5. Verify order status is CONFIRMED ───────────────────────────────────
    if (order.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Refunds can only be requested for confirmed orders' },
        { status: 400 }
      );
    }

    // ── 6. If ticketId provided: verify ticket belongs to order and is not refunded ──
    let refundAmount: number;

    if (ticketId) {
      const ticket = order.tickets.find((t) => t.id === ticketId);
      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket not found in this order' },
          { status: 404 }
        );
      }
      if (ticket.isRefunded) {
        return NextResponse.json(
          { error: 'This ticket has already been refunded' },
          { status: 400 }
        );
      }
      refundAmount = ticket.price;
    } else {
      // ── 7. Full order refund amount ────────────────────────────────────────
      refundAmount = order.totalAmount;
    }

    // ── 8. Check for duplicate pending refund request ─────────────────────────
    const existing = await prisma.refundRequest.findFirst({
      where: {
        orderId,
        ticketId: ticketId ?? null,
        status: 'PENDING',
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A pending refund request already exists for this order/ticket' },
        { status: 409 }
      );
    }

    // ── 9. Create refund request ──────────────────────────────────────────────
    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        ticketId: ticketId ?? null,
        userId,
        reason,
        status: 'PENDING',
        amount: refundAmount,
      },
    });

    return NextResponse.json(refundRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating refund request:', error);
    return NextResponse.json({ error: 'Failed to create refund request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('refunds:list', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const refundRequests = await prisma.refundRequest.findMany({
      where: { userId },
      include: {
        order: {
          include: {
            event: { select: { title: true, startDate: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(refundRequests);
  } catch (error) {
    console.error('Error fetching refund requests:', error);
    return NextResponse.json({ error: 'Failed to fetch refund requests' }, { status: 500 });
  }
}
