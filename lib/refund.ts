/**
 * Refund helpers — server-side only.
 *
 * Handles Stripe refund execution and ticket invalidation.
 * Always call inside a Prisma transaction or after verifying state.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

const stripe = (() => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key && key !== 'YOUR_STRIPE_SECRET_KEY') {
    return new Stripe(key, { apiVersion: '2026-02-25.clover' as any });
  }
  return null;
})();

/** Issue a Stripe refund (or no-op if Stripe not configured). Returns refund id or null. */
export async function issueStripeRefund(
  paymentIntentId: string | null | undefined,
  amountCents: number
): Promise<string | null> {
  if (!stripe || !paymentIntentId) return null;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
    });
    return refund.id;
  } catch (err) {
    console.error('Stripe refund error:', err);
    return null;
  }
}

/**
 * Approve and process a refund request:
 * 1. Issue Stripe refund (if configured)
 * 2. Invalidate the ticket(s)
 * 3. Update order status
 * 4. Mark RefundRequest as PROCESSED
 * 5. Notify user
 * 6. Write audit log
 */
export async function processRefund(
  refundRequestId: string,
  adminId: string,
  reviewNote?: string
): Promise<{ success: boolean; error?: string }> {
  const rr = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: {
      order: { include: { tickets: true } },
      ticket: true,
    },
  });

  if (!rr) return { success: false, error: 'Refund request not found' };
  if (rr.status === 'PROCESSED') return { success: false, error: 'Already processed' };

  const amountCents = Math.round(rr.amount * 100);
  const stripeRefundId = await issueStripeRefund(
    rr.order.stripePaymentIntentId,
    amountCents
  );

  // Determine which tickets to invalidate
  const ticketsToRefund = rr.ticketId
    ? [rr.ticket!]
    : rr.order.tickets;

  const isFullRefund = !rr.ticketId || rr.order.tickets.length === ticketsToRefund.length;

  await prisma.$transaction([
    // Invalidate tickets
    prisma.ticket.updateMany({
      where: { id: { in: ticketsToRefund.map((t) => t.id) } },
      data: { isRefunded: true, refundedAt: new Date() },
    }),
    // Update order status
    prisma.order.update({
      where: { id: rr.orderId },
      data: { status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
    }),
    // Mark refund request processed
    prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: 'PROCESSED',
        stripeRefundId: stripeRefundId ?? undefined,
        reviewedBy: adminId,
        reviewNote: reviewNote ?? undefined,
      },
    }),
  ]);

  // Restore ticket availability
  for (const ticket of ticketsToRefund) {
    await prisma.ticketType.update({
      where: { id: ticket.ticketTypeId },
      data: { available: { increment: 1 } },
    });
  }

  // Notify user
  await createNotification(
    rr.userId,
    'BOOKING_CONFIRMED',
    'Refund processed',
    `Your refund of €${rr.amount.toFixed(2)} has been processed.${stripeRefundId ? ' It will appear on your statement within 5–10 business days.' : ''}`,
    '/tickets'
  );

  await createAuditLog({
    actorId: adminId,
    action: 'PROCESS_REFUND',
    entityType: 'refund',
    entityId: refundRequestId,
    details: JSON.stringify({ amount: rr.amount, stripeRefundId }),
  });

  return { success: true };
}

/** Reject a refund request */
export async function rejectRefund(
  refundRequestId: string,
  adminId: string,
  reviewNote: string
): Promise<void> {
  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: { status: 'REJECTED', reviewedBy: adminId, reviewNote },
  });

  const rr = await prisma.refundRequest.findUnique({ where: { id: refundRequestId } });
  if (rr) {
    await createNotification(
      rr.userId,
      'BOOKING_CONFIRMED',
      'Refund request declined',
      reviewNote || 'Your refund request was not approved. Contact support if you have questions.',
      '/tickets'
    );
  }

  await createAuditLog({
    actorId: adminId,
    action: 'REJECT_REFUND',
    entityType: 'refund',
    entityId: refundRequestId,
    details: JSON.stringify({ reviewNote }),
  });
}
