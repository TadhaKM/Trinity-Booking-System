/**
 * POST /api/auth/signup
 *
 * Security hardening applied:
 *  - IP-based rate limiting (10 attempts per 15 min) — OWASP A07
 *  - Zod input validation (replaces manual checks) — OWASP A03
 *  - bcrypt password hashing (cost factor 12) — OWASP A02
 *  - Generic 500 errors (no internal details leaked) — OWASP A05
 *  - Password never returned in response — OWASP A02
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { SignupSchema, zodErrors } from '@/lib/validation';

export async function POST(request: NextRequest) {
  // ── 1. Rate limiting (per IP) ───────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('auth:signup', ip, LIMITS.AUTH.limit, LIMITS.AUTH.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    // ── 2. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodErrors(parsed) },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;
    const normalizedEmail = email; // Zod already trims + lowercases via the email primitive

    // ── 3. Check for duplicate email ──────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // ── 4. Hash password before storing — OWASP A02 ───────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    const isOrganiser = role === 'organiser';

    // ── 5. Create user ────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        isOrganiser,
      },
    });

    // ── 6. Return safe payload (password excluded) ────────────────────────────
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isOrganiser: user.isOrganiser,
      isAdmin: false,
      profilePicture: null,
    });
  } catch (error: any) {
    console.error('Signup error:', error);

    // Prisma unique constraint — race condition between check and insert
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
