/**
 * POST /api/organiser/connect/dashboard-link
 * Returns a Stripe Express dashboard login link for an organiser.
 * The link is single-use and expires quickly — generate it on demand only.
 *
 * Body: { userId: string }
 * Returns: { url: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || stripeSecretKey === 'YOUR_STRIPE_SECRET_KEY') {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  }

  let userId: string;
  try {
    ({ userId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeConnectId) {
    return NextResponse.json({ error: 'No Stripe Connect account found for this user.' }, { status: 404 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' as any });

    const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectId);
    return NextResponse.json({ url: loginLink.url });
  } catch (error: any) {
    console.error('Stripe Connect dashboard-link error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate dashboard link.' }, { status: 500 });
  }
}
