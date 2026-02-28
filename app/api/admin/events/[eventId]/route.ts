/**
 * DELETE /api/admin/events/[eventId]
 *
 * Security hardening applied:
 *  - Zod schema validation — enforces adminId length limit — OWASP A03
 *  - Admin identity verified server-side via DB — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AdminOrderDeleteSchema, zodErrors } from '@/lib/validation';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // ── 1. Validate body ──────────────────────────────────────────────────────
    const body = await request.json();
    const parsed = AdminOrderDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    // ── 2. Verify admin ───────────────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: parsed.data.adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 3. Delete event cascade (tickets → orders → ticketTypes → event) ──────
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        orders: { include: { tickets: true } },
        ticketTypes: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    for (const order of event.orders) {
      await prisma.ticket.deleteMany({ where: { orderId: order.id } });
    }

    await prisma.order.deleteMany({ where: { eventId } });
    await prisma.ticketType.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete event error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
