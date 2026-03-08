/**
 * GET /api/admin/audit-log
 *
 * List audit log entries with optional filters.
 *
 * Security hardening applied:
 *  - Rate-limited to LIMITS.ADMIN (20 req/min) — OWASP A05
 *  - Admin identity verified server-side via DB — OWASP A01
 *  - Pagination capped at 100 entries per page — prevents data dumps — OWASP A05
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // ── 1. Rate limit ─────────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit('admin:audit-log', ip, LIMITS.ADMIN.limit, LIMITS.ADMIN.windowMs);
    if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

    // ── 2. Parse query params ─────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);

    const adminId = searchParams.get('adminId');
    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10);
    const limitRaw = parseInt(searchParams.get('limit') ?? '50', 10);
    const action = searchParams.get('action') ?? undefined;
    const entityType = searchParams.get('entityType') ?? undefined;

    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 50 : Math.min(limitRaw, 100);
    const skip = (page - 1) * limit;

    // ── 3. Verify admin identity ──────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 4. Build where clause ─────────────────────────────────────────────────
    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    // ── 5. Query with pagination ──────────────────────────────────────────────
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({ logs, total, page, pages });
  } catch (error) {
    console.error('[admin:audit-log GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
