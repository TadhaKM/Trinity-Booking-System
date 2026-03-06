/**
 * POST /api/payments/create-intent
 * Creates a Stripe PaymentIntent for a given amount.
 * If the event organiser has a verified Stripe Connect account the payment
 * is automatically split: organiser receives amount minus the 5% platform fee.
 *
 * Body: { amount: number (cents), currency?: string, metadata?: object, organiserId?: string }
 * Returns: { clientSecret: string, configured: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey || stripeSecretKey === 'YOUR_STRIPE_SECRET_KEY') {
    return NextResponse.json(
      { clientSecret: 'pi_mock_secret_stripe_not_configured', configured: false },
      { status: 200 }
    );
  }

  try {
    const body = await request.json();
    const { amount, currency = 'eur', metadata = {}, organiserId } = body;

    if (!amount || typeof amount !== 'number' || amount < 50) {
      return NextResponse.json({ error: 'Invalid amount. Minimum is €0.50.' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    const intentParams: any = {
      amount: Math.round(amount),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata,
    };

    // If the organiser has a verified Connect account, split the payment
    if (organiserId) {
      const organiser = await prisma.user.findUnique({ where: { id: organiserId } });
      if (organiser?.stripeConnectId && organiser.payoutsEnabled) {
        // Platform fee = 5% of total (same rate as the booking fee shown to the customer)
        const platformFee = Math.round(amount * 0.05);
        intentParams.application_fee_amount = platformFee;
        intentParams.transfer_data = { destination: organiser.stripeConnectId };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, configured: true });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: 'Failed to create payment intent.' }, { status: 500 });
  }
}
