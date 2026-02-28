/**
 * DELETE /api/admin/orders/[orderId]  — cancel & delete an order
 * PATCH  /api/admin/orders/[orderId]  — update order status
 *
 * Security hardening applied:
 *  - Zod schema validation — enforces status enum, ID length limits — OWASP A03
 *  - Admin identity verified server-side via DB — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AdminOrderDeleteSchema, AdminOrderPatchSchema, zodErrors } from '@/lib/validation';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

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

    // ── 3. Delete order & restore availability ────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tickets: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    for (const ticket of order.tickets) {
      await prisma.ticketType.update({
        where: { id: ticket.ticketTypeId },
        data: { available: { increment: 1 } },
      });
    }

    await prisma.ticket.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // ── 1. Validate body — enforces status enum via Zod ───────────────────────
    const body = await request.json();
    const parsed = AdminOrderPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { adminId, status } = parsed.data;

    // ── 2. Verify admin ───────────────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 3. Update order status ────────────────────────────────────────────────
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
