/**
 * Notification helper.
 * Call createNotification() anywhere after a triggering action.
 * It is fire-and-forget — errors are logged but never bubble up to callers.
 */

import { prisma } from '@/lib/db';

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'TICKET_RECEIVED'
  | 'EVENT_REMINDER'
  | 'NEW_EVENT'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'WAITLIST_PROMOTED'
  | 'LOW_AVAILABILITY';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, link: link ?? null },
    });
  } catch (err) {
    // Non-fatal — notification failure must never break the parent action
    console.error('[notifications] Failed to create notification:', err);
  }
}

/**
 * Promote the next waitlisted user for a ticket type when availability opens.
 * Call this after a cancellation or capacity increase.
 */
export async function promoteNextWaitlistEntry(
  ticketTypeId: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  try {
    const next = await prisma.waitlistEntry.findFirst({
      where: { ticketTypeId, notified: false },
      orderBy: { position: 'asc' },
    });
    if (!next) return;

    await prisma.waitlistEntry.update({
      where: { id: next.id },
      data: { notified: true },
    });

    await createNotification(
      next.userId,
      'WAITLIST_PROMOTED',
      'Spot available!',
      `A ticket for "${eventTitle}" is now available. Book quickly before it goes.`,
      `/events/${eventId}`
    );
  } catch (err) {
    console.error('[notifications] Failed to promote waitlist:', err);
  }
}
