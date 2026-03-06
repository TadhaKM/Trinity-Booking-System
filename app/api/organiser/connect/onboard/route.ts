/**
 * POST /api/organiser/connect/onboard
 * Creates (or retrieves) a Stripe Connect Express account for an organiser
 * and returns a Stripe-hosted onboarding URL.
 *
 * Body: { userId: string }
 * Returns: { url: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || stripeSecretKey === 'YOUR_STRIPE_SECRET_KEY') {
    return NextResponse.json({ error: 'Stripe is not configured on this server.' }, { status: 503 });
  }

  let userId: string;
  try {
    ({ userId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isOrganiser) {
    return NextResponse.json({ error: 'User not found or is not an organiser.' }, { status: 403 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' as any });

    let connectId = user.stripeConnectId;

    // Create a new Express account if none exists yet
    if (!connectId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: { name: user.name },
      });
      connectId = account.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeConnectId: connectId } });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${appUrl}/organiser/dashboard?connect=refresh`,
      return_url:  `${appUrl}/organiser/dashboard?connect=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Stripe Connect onboard error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start onboarding.' }, { status: 500 });
  }
}
