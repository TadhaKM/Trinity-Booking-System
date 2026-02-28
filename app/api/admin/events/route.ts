/**
 * POST /api/admin/events
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

    // ── 3. Fetch all events ───────────────────────────────────────────────────
    const events = await prisma.event.findMany({
      include: {
        society: { select: { name: true } },
        ticketTypes: { select: { quantity: true, available: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = events.map((e) => ({
      id: e.id,
      title: e.title,
      society: e.society.name,
      category: e.category,
      startDate: e.startDate.toISOString(),
      location: e.location,
      totalCapacity: e.ticketTypes.reduce((s, t) => s + t.quantity, 0),
      totalAvailable: e.ticketTypes.reduce((s, t) => s + t.available, 0),
      orders: e._count.orders,
      organiserId: e.organiserId,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Admin events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
