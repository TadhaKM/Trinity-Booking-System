import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateQRCode, calculateFees, applyCoupon } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { userId, eventId, ticketSelections, couponCode } = await request.json();

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required. Please log in again.' },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required.' },
        { status: 400 }
      );
    }

    if (!ticketSelections || ticketSelections.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one ticket.' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please log in again.' },
        { status: 404 }
      );
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 }
      );
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
    let couponId = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.expiresAt >= new Date() && coupon.usedCount < coupon.maxUses) {
        const discountInfo = applyCoupon(subtotal, coupon.discountPercent);
        discount = discountInfo.discount;
        subtotal = discountInfo.newAmount;
        couponId = coupon.id;

        // Increment coupon usage
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
          userId,
          eventId,
          totalAmount: total,
          status: 'CONFIRMED',
          tickets: {
            create: ticketSelections.flatMap((selection: any) =>
              Array.from({ length: selection.quantity }, () => ({
                ticketTypeId: selection.ticketTypeId,
                price: 0, // Will be updated below
                qrCode: generateQRCode(),
              }))
            ),
          },
        },
        include: {
          tickets: true,
        },
      });

      // Update ticket prices (workaround for promise issue)
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
  } catch (error: any) {
    console.error('Error creating booking:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A duplicate booking was detected. Please try again.' },
        { status: 400 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference: The user, event, or ticket type does not exist.' },
        { status: 400 }
      );
    }

    const errorMessage = error.message || 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create booking: ${errorMessage}` },
      { status: 500 }
    );
  }
}
