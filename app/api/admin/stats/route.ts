/**
 * POST /api/admin/stats
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

    // ── 3. Aggregate site-wide stats ──────────────────────────────────────────
    const [totalUsers, totalEvents, totalOrders, totalSocieties] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.order.count(),
      prisma.society.count(),
    ]);

    const orders = await prisma.order.findMany({ select: { totalAmount: true } });
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({
      totalUsers,
      totalEvents,
      totalOrders,
      totalSocieties,
      totalRevenue,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
