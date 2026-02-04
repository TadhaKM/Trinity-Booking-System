import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateQRCode, calculateFees, applyCoupon } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { guestName, guestEmail, eventId, ticketSelections, couponCode } =
      await request.json();

    if (!guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Find or create a guest user
    let guestUser = await prisma.user.findFirst({
      where: { email: guestEmail },
    });

    if (!guestUser) {
      guestUser = await prisma.user.create({
        data: {
          email: guestEmail,
          name: guestName,
          isOrganiser: false,
        },
      });
    }

    // Validate ticket availability
    for (const selection of ticketSelections) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: selection.ticketTypeId },
      });

      if (!ticketType) {
        return NextResponse.json(
          { error: 'Invalid ticket type' },
          { status: 400 }
        );
      }

      if (ticketType.available < selection.quantity) {
        return NextResponse.json(
          { error: `Not enough tickets available for ${ticketType.name}` },
          { status: 400 }
        );
      }
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const selection of ticketSelections) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: selection.ticketTypeId },
      });
      if (ticketType) {
        subtotal += ticketType.price * selection.quantity;
      }
    }

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode.toUpperCase() },
      });

      if (
        coupon &&
        coupon.expiresAt >= new Date() &&
        coupon.usedCount < coupon.maxUses
      ) {
        const discountInfo = applyCoupon(subtotal, coupon.discountPercent);
        discount = discountInfo.discount;
        subtotal = discountInfo.newAmount;

        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // Calculate fees and total
    const { bookingFee, total } = calculateFees(subtotal);

    // Create order and tickets in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Update ticket availability
      for (const selection of ticketSelections) {
        await tx.ticketType.update({
          where: { id: selection.ticketTypeId },
          data: {
            available: {
              decrement: selection.quantity,
            },
          },
        });
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: guestUser.id,
          eventId,
          totalAmount: total,
          status: 'CONFIRMED',
          tickets: {
            create: ticketSelections.flatMap((selection: any) =>
              Array.from({ length: selection.quantity }, () => ({
                ticketTypeId: selection.ticketTypeId,
                price: 0,
                qrCode: generateQRCode(),
              }))
            ),
          },
        },
        include: {
          tickets: true,
        },
      });

      // Update ticket prices
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

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating guest booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
