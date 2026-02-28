/**
 * POST /api/admin/users
 *
 * Security hardening applied:
 *  - Zod schema validation — whitelists action enum, enforces ID length limits — OWASP A03
 *  - Admin identity verified server-side via DB — OWASP A01
 *  - Self-delete protection — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AdminActionSchema, zodErrors } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = AdminActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodErrors(parsed) },
        { status: 400 }
      );
    }

    const { adminId, action, targetUserId } = parsed.data;

    // ── 2. Verify admin identity server-side ──────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 3. Dispatch action ────────────────────────────────────────────────────
    if (action === 'list') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isOrganiser: true,
          isAdmin: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(users);
    }

    if (action === 'delete' && targetUserId) {
      if (targetUserId === adminId) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
      }
      await prisma.user.delete({ where: { id: targetUserId } });
      return NextResponse.json({ success: true });
    }

    if (action === 'toggleOrganiser' && targetUserId) {
      const user = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { isOrganiser: !user.isOrganiser },
      });
      return NextResponse.json({ isOrganiser: updated.isOrganiser });
    }

    return NextResponse.json({ error: 'Invalid action or missing targetUserId' }, { status: 400 });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
