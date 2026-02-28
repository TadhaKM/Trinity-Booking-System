/**
 * POST /api/admin/orders
 *
 * Security hardening applied:
 *  - Zod schema validation — enforces adminId length limit — OWASP A03
 *  - Admin identity verified server-side via DB — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AdminOrderDeleteSchema, zodErrors } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = AdminOrderDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodErrors(parsed) },
        { status: 400 }
      );
    }

    const { adminId } = parsed.data;

    // ── 2. Verify admin identity server-side ──────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 3. Fetch all orders ───────────────────────────────────────────────────
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { title: true } },
        tickets: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      userName: o.user.name,
      userEmail: o.user.email,
      eventTitle: o.event.title,
      ticketCount: o.tickets.length,
      totalAmount: o.totalAmount,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
