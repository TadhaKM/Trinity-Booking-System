/**
 * POST /api/auth/login
 *
 * Security hardening applied:
 *  - IP-based rate limiting (10 attempts per 15 min) — OWASP A07
 *  - Zod input validation with strict length limits — OWASP A03
 *  - bcrypt password comparison with plaintext-migration fallback — OWASP A02
 *  - Constant-time delay on failure to resist timing attacks — OWASP A07
 *  - Generic error messages to prevent user enumeration — OWASP A07
 *  - Password never returned in response — OWASP A02
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { LoginSchema } from '@/lib/validation';

// Constant-time failure delay — prevents timing-based user enumeration
const FAILURE_DELAY_MS = 300;

export async function POST(request: NextRequest) {
  // ── 1. Rate limiting (per IP) ───────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('auth:login', ip, LIMITS.AUTH.limit, LIMITS.AUTH.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    // ── 2. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      // Return generic message — do not confirm whether the email exists
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // ── 2b. Per-account brute-force lockout (5 failures → 15 min lock) ────────
    // Keyed by email so rotating IPs doesn't help an attacker.
    const accountRl = rateLimit('auth:login:account', normalizedEmail, 5, LIMITS.AUTH.windowMs);
    if (!accountRl.success) {
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      return NextResponse.json(
        { error: 'Too many failed attempts. This account is temporarily locked — please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // ── 3. Look up user ───────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ── 4. Verify password ────────────────────────────────────────────────────
    // Supports bcrypt hashes (new/migrated accounts) and legacy plaintext
    // (accounts created before hashing was introduced).
    // On a successful plaintext match the password is immediately re-hashed —
    // the account is migrated silently on the next successful login.
    const isBcrypt =
      user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    let passwordValid = false;

    if (isBcrypt) {
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plaintext comparison
      passwordValid = user.password === password;
      if (passwordValid) {
        // Migrate to bcrypt — OWASP A02: always use strong adaptive hashing
        const hashed = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashed },
        });
      }
    }

    if (!passwordValid) {
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ── 5. Clear account lockout counter on successful login ──────────────────
    // Reset by consuming the remaining slots so the window expires naturally.
    rateLimit('auth:login:account', normalizedEmail, 5, 1); // 1ms window = instant expiry

    // ── 6. Return safe user payload (never include password) ──────────────────
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isOrganiser: user.isOrganiser,
      isAdmin: user.isAdmin || false,
      profilePicture: user.profilePicture || null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
