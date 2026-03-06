/**
 * STRIPE CONNECT DEMO — Platform Subscription (stripe_balance)
 * ============================================================
 * POST /api/connect-demo/subscription
 *
 * Creates a PLATFORM SUBSCRIPTION that charges the connected account
 * a recurring platform fee using the `stripe_balance` payment method.
 *
 * How stripe_balance works:
 * ─────────────────────────
 * Instead of charging a customer's card, we charge the connected account's
 * own Stripe balance. This is ideal for SaaS / platform subscription fees
 * because:
 *   - No card details needed — the account's existing balance is used
 *   - Automatic deduction from payouts
 *   - The connected account authorises this via TOS acceptance at onboarding
 *
 * Flow:
 * 1. Create (or retrieve) a subscription Product on the PLATFORM account
 * 2. Create a SetupIntent with payment_method_types: ['stripe_balance']
 *    and customer_account pointing at the connected account
 * 3. Confirm the SetupIntent — in sandbox this completes immediately
 * 4. Create a Subscription using the confirmed payment method
 *
 * customer_account (V2 field):
 *   Unlike V1's `customer` (a Customer object ID), V2 uses `customer_account`
 *   which directly references a connected account ID (acct_xxx). This means
 *   you don't need to create a separate Customer object for the merchant.
 *
 * Blueprint reference: subscriptions-and-embedded-payments / platform-subscription
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

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required.' }, { status: 400 });
    }

    // Look up the connected account from our DB
    const demo = await prisma.connectDemoAccount.findUnique({
      where: { id: accountId },
    });
    if (!demo) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const stripeClient = await getStripeClient();

    // ── Step 1: Get or create the platform subscription product ───────────────
    //
    // The product lives on the PLATFORM account (no stripeAccount header).
    // We use metadata to cache the product ID so we only create it once.
    //
    // In production you'd typically store this in your DB or env variable.
    let productId: string;
    let priceId: string;

    const existingProducts = await stripeClient.products.search({
      query: 'metadata["platform_subscription"]:"true"',
    });

    if (existingProducts.data.length > 0) {
      // Reuse existing subscription product
      const product = existingProducts.data[0];
      productId = product.id;

      // Get the default price for this product
      const prices = await stripeClient.prices.list({
        product: productId,
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        throw new Error('No active price found for subscription product.');
      }
      priceId = prices.data[0].id;
    } else {
      // Create the subscription product on the platform account
      //
      // Blueprint:
      //   stripeClient.products.create({
      //     name: 'Platform subscription',
      //     metadata: { platform_subscription: 'true' },
      //   })
      const product = await stripeClient.products.create({
        name: 'Platform Subscription',
        description: 'Monthly platform fee for using the TCD Tickets marketplace.',
        metadata: { platform_subscription: 'true' },
      });
      productId = product.id;

      // Create a recurring monthly price (€29/month)
      //
      // Blueprint:
      //   stripeClient.prices.create({
      //     product: product.id,
      //     unit_amount: 2900,
      //     currency: 'eur',
      //     recurring: { interval: 'month' },
      //   })
      const price = await stripeClient.prices.create({
        product: productId,
        unit_amount: 2900, // €29.00
        currency: 'eur',
        recurring: { interval: 'month' },
      });
      priceId = price.id;
    }

    // ── Step 2: Create a SetupIntent with stripe_balance ──────────────────────
    //
    // A SetupIntent is used to authorise a payment method for future use —
    // in this case, the connected account's Stripe balance.
    //
    // Key parameters:
    //   payment_method_types: ['stripe_balance']
    //     Only stripe_balance is valid here — it draws from the connected
    //     account's available Stripe balance rather than a card.
    //
    //   customer_account: demo.stripeAccountId
    //     V2 field that links this SetupIntent to the connected account.
    //     Unlike the V1 `customer` field (Customer object), this directly
    //     references the account's acct_xxx ID.
    //
    // Blueprint:
    //   stripeClient.setupIntents.create({
    //     payment_method_types: ['stripe_balance'],
    //     customer_account: connectedAccountId,
    //   })
    const setupIntent = await (stripeClient.setupIntents.create as any)({
      payment_method_types: ['stripe_balance'],
      customer_account: demo.stripeAccountId,
    });

    // ── Step 3: Confirm the SetupIntent ───────────────────────────────────────
    //
    // Confirming authorises the stripe_balance payment method.
    // In sandbox, this completes synchronously with status: 'succeeded'.
    //
    // In production, the connected account's TOS acceptance (done during
    // onboarding) is what authorises this deduction from their balance.
    //
    // Blueprint:
    //   stripeClient.setupIntents.confirm(setupIntent.id, {
    //     payment_method: 'stripe_balance',
    //   })
    const confirmedSetupIntent = await (stripeClient.setupIntents.confirm as any)(
      setupIntent.id,
      { payment_method: 'stripe_balance' }
    );

    if (confirmedSetupIntent.status !== 'succeeded') {
      throw new Error(`SetupIntent failed with status: ${confirmedSetupIntent.status}`);
    }

    // ── Step 4: Create the Subscription ──────────────────────────────────────
    //
    // Now we create the actual subscription on the PLATFORM account, referencing
    // the connected account via customer_account and using the confirmed
    // stripe_balance payment method.
    //
    // The subscription will automatically charge the connected account's balance
    // each billing period (monthly).
    //
    // Blueprint:
    //   stripeClient.subscriptions.create({
    //     customer_account: connectedAccountId,
    //     items: [{ price: priceId }],
    //     default_payment_method: 'stripe_balance',
    //   })
    const subscription = await (stripeClient.subscriptions.create as any)({
      customer_account: demo.stripeAccountId,
      items: [{ price: priceId }],
      default_payment_method: 'stripe_balance',
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        amount: 2900, // €29.00 in cents
        currency: 'eur',
        interval: 'month',
      },
    });
  } catch (error: any) {
    console.error('[connect-demo] Subscription error:', error);

    // Provide helpful error message for sandbox limitations
    if (error.message?.includes('stripe_balance')) {
      return NextResponse.json({
        error: 'stripe_balance subscriptions require a V2 connected account with simulate_accept_tos_obo enabled in sandbox.',
        details: error.message,
      }, { status: 400 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/connect-demo/subscription?accountId=xxx
 * Returns the active platform subscription for a connected account, if any.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required.' }, { status: 400 });
    }

    const demo = await prisma.connectDemoAccount.findUnique({
      where: { id: accountId },
    });
    if (!demo) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const stripeClient = await getStripeClient();

    // List subscriptions for this connected account
    // customer_account filter is V2 — fall back gracefully
    const subscriptions = await (stripeClient.subscriptions.list as any)({
      customer_account: demo.stripeAccountId,
      status: 'all',
      limit: 5,
    });

    return NextResponse.json({ subscriptions: subscriptions.data ?? [] });
  } catch (error: any) {
    // customer_account filter may not be available on all API versions
    console.warn('[connect-demo] Subscription list error:', error.message);
    return NextResponse.json({ subscriptions: [] });
  }
}
