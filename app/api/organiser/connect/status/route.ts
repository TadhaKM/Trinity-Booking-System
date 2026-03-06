/**
 * GET /api/organiser/connect/status?userId=xxx
 * Returns the Stripe Connect account status for an organiser.
 *
 * Returns: { connected, payoutsEnabled, chargesEnabled, stripeConfigured, accountId? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || stripeSecretKey === 'YOUR_STRIPE_SECRET_KEY') {
    return NextResponse.json({ connected: false, payoutsEnabled: false, stripeConfigured: false });
  }

  if (!user.stripeConnectId) {
    return NextResponse.json({ connected: false, payoutsEnabled: false, stripeConfigured: true });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' as any });

    const account = await stripe.accounts.retrieve(user.stripeConnectId);
    const payoutsEnabled = account.payouts_enabled ?? false;
    const chargesEnabled = account.charges_enabled ?? false;

    // Sync payoutsEnabled to DB if it changed
    if (payoutsEnabled !== user.payoutsEnabled) {
      await prisma.user.update({ where: { id: userId }, data: { payoutsEnabled } });
    }

    return NextResponse.json({
      connected: true,
      payoutsEnabled,
      chargesEnabled,
      stripeConfigured: true,
      accountId: account.id,
      requirements: account.requirements?.currently_due ?? [],
    });
  } catch (error: any) {
    console.error('Stripe Connect status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch account status.' }, { status: 500 });
  }
}
