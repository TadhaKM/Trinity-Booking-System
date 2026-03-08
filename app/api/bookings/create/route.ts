/**
 * POST /api/bookings/create
 *
 * Security hardening applied:
 *  - IP-based rate limiting (30 req/min) — OWASP A07
 *  - Zod schema validation (CreateBookingSchema) — OWASP A03
 *  - No internal error details leaked to caller — OWASP A05
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateQRCode, calculateFees, applyCoupon } from '@/lib/utils';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { CreateBookingSchema, zodErrors } from '@/lib/validation';
import { createNotification, promoteNextWaitlistEntry } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('bookings:create', ip, LIMITS.BOOKING.limit, LIMITS.BOOKING.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    // ── 2. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodErrors(parsed) },
        { status: 400 }
      );
    }

    const { userId, eventId, ticketSelections, couponCode } = parsed.data;

    // ── 3. Verify user & event exist ──────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please log in again.' },
        { status: 404 }
      );
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 }
      );
    }

    // ── Demo guardrail: max 5 orders per user ─────────────────────────────────
    if (!user.isAdmin && !user.isOrganiser) {
      const orderCount = await prisma.order.count({ where: { userId } });
      if (orderCount >= 5) {
        return NextResponse.json(
          { error: 'Demo limit reached: you can place up to 5 orders in this demo version.' },
          { status: 403 }
        );
      }
    }

    // ── 4. Validate ticket availability ───────────────────────────────────────
    for (const selection of ticketSelections) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: selection.ticketTypeId },
      });

      if (!ticketType) {
        return NextResponse.json(
          { error: 'Invalid ticket type.' },
          { status: 400 }
        );
      }

      if (ticketType.available < selection.quantity) {
        return NextResponse.json(
          { error: `Not enough tickets available for ${ticketType.name}.` },
          { status: 400 }
        );
      }
    }

    // ── 5. Calculate subtotal ─────────────────────────────────────────────────
    let subtotal = 0;
    for (const selection of ticketSelections) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: selection.ticketTypeId },
      });
      if (ticketType) {
        subtotal += ticketType.price * selection.quantity;
      }
    }

    // ── 6. Apply coupon (if provided) ─────────────────────────────────────────
    let couponId = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.expiresAt >= new Date() && coupon.usedCount < coupon.maxUses) {
        const discountInfo = applyCoupon(subtotal, coupon.discountPercent);
        subtotal = discountInfo.newAmount;
        couponId = coupon.id;

        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // ── 7. Calculate fees and total ───────────────────────────────────────────
    const { bookingFee, total } = calculateFees(subtotal);

    // ── 8. Create order & tickets in a transaction ────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      for (const selection of ticketSelections) {
        await tx.ticketType.update({
          where: { id: selection.ticketTypeId },
          data: { available: { decrement: selection.quantity } },
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          eventId,
          totalAmount: total,
          status: 'CONFIRMED',
          tickets: {
            create: ticketSelections.flatMap((selection) =>
              Array.from({ length: selection.quantity }, () => ({
                ticketTypeId: selection.ticketTypeId,
                price: 0,
                qrCode: generateQRCode(),
              }))
            ),
          },
        },
        include: { tickets: true },
      });

      // Update each ticket with its actual price
      for (const ticket of newOrder.tickets) {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: ticket.ticketTypeId },
        });
        if (ticketType) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { price: ticketType.price },
          });
        }
      }

      return newOrder;
    });

    // ── 9. Fire-and-forget: booking confirmation notification ─────────────────
    createNotification(
      userId,
      'BOOKING_CONFIRMED',
      'Booking confirmed!',
      `Your booking for "${event.title}" is confirmed. View your tickets below.`,
      '/tickets'
    );

    // ── 10. Check if any ticket types became sold out → promote waitlist ─────
    for (const selection of ticketSelections) {
      const tt = await prisma.ticketType.findUnique({ where: { id: selection.ticketTypeId } });
      if (tt && tt.available === 0) {
        promoteNextWaitlistEntry(tt.id, eventId, event.title);
      }
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating booking:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A duplicate booking was detected. Please try again.' },
        { status: 400 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference: the user, event, or ticket type does not exist.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create booking. Please try again.' },
      { status: 500 }
    );
  }
}
