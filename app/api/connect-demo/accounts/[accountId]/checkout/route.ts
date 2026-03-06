/**
 * STRIPE CONNECT DEMO — Checkout Session (Direct Charge)
 * ========================================================
 * POST /api/connect-demo/accounts/[accountId]/checkout
 *
 * Creates a Stripe Hosted Checkout session as a DIRECT CHARGE on the
 * connected account. In this model:
 *
 *   - The connected account is the "merchant of record"
 *   - The charge appears in the connected account's Stripe dashboard
 *   - Payouts go directly to the connected account's bank account
 *   - The PLATFORM earns `application_fee_amount` automatically
 *
 * This contrasts with the Destination Charge model, where the platform
 * is the merchant of record and then transfers funds to the connected account.
 * Direct Charges are simpler for marketplace/platform scenarios.
 *
 * Using Hosted Checkout means Stripe handles the payment form, PCI compliance,
 * and payment method display — no custom UI needed for checkout.
 *
 * Blueprint reference: accept-embedded-payments-chapter / create-checkout-session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

async function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'YOUR_STRIPE_SECRET_KEY') {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  const Stripe = (await import('stripe')).default;
  return new Stripe(secretKey);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const demo = await prisma.connectDemoAccount.findUnique({
      where: { id: accountId },
    });
    if (!demo) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

    // Accepts either a priceId (for existing products) or ad-hoc price_data
    const { priceId, productName, unitAmount, currency = 'eur' } = await request.json();

    if (!priceId && (!productName || !unitAmount)) {
      return NextResponse.json(
        { error: 'Provide either priceId, or productName + unitAmount.' },
        { status: 400 }
      );
    }

    const stripeClient = await getStripeClient();

    // PLACEHOLDER: Set NEXT_PUBLIC_APP_URL in .env for production
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ── Application fee ────────────────────────────────────────────────────
    //
    // The platform takes a percentage fee from each transaction.
    // This is deducted from the connected account's proceeds automatically.
    // The customer still pays the full displayed price.
    const PLATFORM_FEE_PERCENT = 0.10; // 10% platform fee — adjust as needed
    const amount = unitAmount ?? 0;
    const applicationFeeAmount = Math.round(amount * PLATFORM_FEE_PERCENT);

    // Build line_items: either reference an existing price or use inline price_data
    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]                      // Existing product price
      : [{                                                       // Ad-hoc price
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: Math.round(unitAmount),
          },
          quantity: 1,
        }];

    // ── Create Hosted Checkout Session (Direct Charge) ────────────────────
    //
    // Blueprint:
    //   stripeClient.checkout.sessions.create(
    //     {
    //       line_items: [{ price_data: {...}, quantity: 1 }],
    //       payment_intent_data: { application_fee_amount: 123 },
    //       mode: 'payment',
    //       success_url: '...?session_id={CHECKOUT_SESSION_ID}',
    //     },
    //     { stripeAccount: connectedAccountId }
    //   )
    //
    // {CHECKOUT_SESSION_ID} is a Stripe template variable — it's replaced
    // automatically with the real session ID when the customer is redirected.
    //
    // payment_intent_data.application_fee_amount:
    //   Amount (in cents) taken from the connected account and sent to your
    //   platform account. Stripe handles this split automatically.
    //
    // stripeAccount (Stripe-Account header):
    //   Makes this a Direct Charge on the connected account. Without this,
    //   the charge would be on your platform account.
    const session = await stripeClient.checkout.sessions.create(
      {
        line_items: lineItems as any,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
        },
        mode: 'payment',
        // CHECKOUT_SESSION_ID is replaced by Stripe automatically on redirect
        success_url: `${appUrl}/connect-demo/success?session_id={CHECKOUT_SESSION_ID}&accountId=${demo.id}`,
        cancel_url: `${appUrl}/connect-demo/${demo.id}`, // Back to storefront on cancel
      },
      {
        stripeAccount: demo.stripeAccountId, // ← Direct Charge on connected account
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[connect-demo] Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
