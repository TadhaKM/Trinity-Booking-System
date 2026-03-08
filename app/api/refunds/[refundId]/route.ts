/**
 * GET   /api/refunds/[refundId]  — get a single refund request (owner or admin)
 * PATCH /api/refunds/[refundId]  — admin approve or reject a refund request
 *
 * Security hardening applied:
 *  - IP-based rate limiting — OWASP A07
 *  - Zod schema validation (ReviewRefundSchema) — OWASP A03
 *  - Admin identity verified server-side via DB — OWASP A01
 *  - Ownership check for non-admin GET access — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { ReviewRefundSchema, zodErrors } from '@/lib/validation';
import { processRefund, rejectRefund } from '@/lib/refund';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ refundId: string }> }
) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('refunds:get', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { refundId } = await params;
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');
    const adminId = searchParams.get('adminId');

    if (!userId && !adminId) {
      return NextResponse.json({ error: 'userId or adminId is required' }, { status: 400 });
    }

    // ── 2. Fetch refund request with related data ─────────────────────────────
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            event: { select: { title: true, startDate: true } },
          },
        },
        ticket: true,
      },
    });

    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    // ── 3. Access control: owner or admin ────────────────────────────────────
    if (adminId) {
      const admin = await prisma.user.findUnique({ where: { id: adminId } });
      if (!admin?.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (userId && refundRequest.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(refundRequest);
  } catch (error) {
    console.error('Error fetching refund request:', error);
    return NextResponse.json({ error: 'Failed to fetch refund request' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ refundId: string }> }
) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('refunds:review', ip, LIMITS.ADMIN.limit, LIMITS.ADMIN.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { refundId } = await params;

    // ── 2. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = ReviewRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrors(parsed) }, { status: 400 });
    }

    const { adminId, action, reviewNote } = parsed.data;

    // ── 3. Verify admin ───────────────────────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── 4. Verify refund request exists ──────────────────────────────────────
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundId },
    });
    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }

    // ── 5. Process or reject ──────────────────────────────────────────────────
    if (action === 'APPROVE') {
      const result = await processRefund(refundId, adminId, reviewNote);
      if (!result.success) {
        return NextResponse.json({ error: result.error ?? 'Failed to process refund' }, { status: 400 });
      }
    } else {
      await rejectRefund(refundId, adminId, reviewNote ?? '');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reviewing refund request:', error);
    return NextResponse.json({ error: 'Failed to review refund request' }, { status: 500 });
  }
}
