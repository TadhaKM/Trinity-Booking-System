/**
 * GET /api/admin/refunds
 *
 * List all refund requests for admin review with pagination and status filtering.
 *
 * Security hardening applied:
 *  - Rate-limited to LIMITS.ADMIN (20 req/min) — OWASP A05
 *  - Admin identity verified server-side via DB — OWASP A01
 *  - Pagination capped at 100 entries per page — prevents data dumps — OWASP A05
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

const VALID_STATUSES: RefundStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'];

export async function GET(request: NextRequest) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('admin:refunds', ip, LIMITS.ADMIN.limit, LIMITS.ADMIN.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Parse query params ─────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);

    const adminId = searchParams.get('adminId');
    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    const statusParam = searchParams.get('status');
    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10);
    const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10);

    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 20 : Math.min(limitRaw, 100);
    const skip = (page - 1) * limit;

    // Validate status filter
    const status: RefundStatus | undefined =
      statusParam && VALID_STATUSES.includes(statusParam as RefundStatus)
        ? (statusParam as RefundStatus)
        : undefined;

    // ── 3. Verify admin identity ──────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 4. Build where clause ─────────────────────────────────────────────────
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // ── 5. Query refund requests with related data ────────────────────────────
    const [refunds, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          order: {
            include: {
              event: { select: { title: true, startDate: true } },
            },
          },
          ticket: {
            select: {
              id: true,
              ticketType: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.refundRequest.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({ refunds, total, page, pages });
  } catch (error) {
    console.error('[admin:refunds GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch refund requests' }, { status: 500 });
  }
}
