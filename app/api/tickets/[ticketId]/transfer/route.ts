/**
 * POST /api/tickets/[ticketId]/transfer
 *
 * Transfers a single ticket to another user identified by email.
 * Security:
 *  - Verifies the ticket belongs to the requesting user's order
 *  - Cannot transfer to yourself
 *  - Cannot transfer an already checked-in ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createNotification } from '@/lib/notifications';

const TransferSchema = z.object({
  senderId: z.string().min(1),
  recipientEmail: z.string().email(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = await request.json();

    const parsed = TransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { senderId, recipientEmail } = parsed.data;

    // ── 1. Load the ticket with its order ─────────────────────────────────────
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { order: true, ticketType: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    // ── 2. Verify sender owns the ticket ──────────────────────────────────────
    if (ticket.order.userId !== senderId) {
      return NextResponse.json({ error: 'You do not own this ticket.' }, { status: 403 });
    }

    // ── 3. Reject already-used tickets ────────────────────────────────────────
    if (ticket.checkedInAt) {
      return NextResponse.json(
        { error: 'This ticket has already been used and cannot be transferred.' },
        { status: 400 }
      );
    }

    // ── 4. Look up recipient ──────────────────────────────────────────────────
    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail.toLowerCase() },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'No account found with that email address. They need to sign up first.' },
        { status: 404 }
      );
    }

    if (recipient.id === senderId) {
      return NextResponse.json(
        { error: 'You cannot send a ticket to yourself.' },
        { status: 400 }
      );
    }

    // ── 5. Transfer in a transaction ──────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // Create a new order for the recipient
      const newOrder = await tx.order.create({
        data: {
          userId: recipient.id,
          eventId: ticket.order.eventId,
          totalAmount: 0, // already paid by sender
          status: 'CONFIRMED',
        },
      });

      // Move the ticket to the new order
      await tx.ticket.update({
        where: { id: ticketId },
        data: { orderId: newOrder.id },
      });

      // If the sender's order now has no tickets, cancel it
      const remainingTickets = await tx.ticket.count({
        where: { orderId: ticket.orderId },
      });
      if (remainingTickets === 0) {
        await tx.order.update({
          where: { id: ticket.orderId },
          data: { status: 'CANCELLED' },
        });
      }
    });

    // Fire-and-forget notifications
    const event = await prisma.event.findUnique({ where: { id: ticket.order.eventId }, select: { title: true, id: true } });
    const eventTitle = event?.title ?? 'an event';
    createNotification(
      recipient.id,
      'TICKET_RECEIVED',
      'You received a ticket!',
      `${ticket.ticketType.name} ticket for "${eventTitle}" has been sent to you.`,
      '/tickets'
    );

    return NextResponse.json({
      success: true,
      message: `Ticket sent to ${recipient.name} (${recipientEmail}).`,
    });
  } catch (error) {
    console.error('Ticket transfer error:', error);
    return NextResponse.json({ error: 'Failed to transfer ticket.' }, { status: 500 });
  }
}
