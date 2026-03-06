/**
 * STRIPE CONNECT DEMO — Products on a Connected Account
 * =======================================================
 * GET  /api/connect-demo/accounts/[accountId]/products  → List products
 * POST /api/connect-demo/accounts/[accountId]/products  → Create a product
 *
 * KEY CONCEPT — The Stripe-Account Header:
 *   Passing `stripeAccount` in the request options routes the API call to
 *   the connected account's Stripe context rather than your platform account.
 *   This means:
 *     - The product is owned by the connected account
 *     - The product appears in the connected account's Stripe dashboard
 *     - Revenue from selling this product goes to the connected account
 *
 * Blueprint reference: create-checkout-session / line_items uses the product
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

// ---------------------------------------------------------------------------
// GET — list active products on the connected account
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const demo = await prisma.connectDemoAccount.findUnique({
      where: { id: accountId },
    });
    if (!demo) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

    const stripeClient = await getStripeClient();

    // ── List products on the connected account ─────────────────────────────
    //
    // Blueprint:
    //   stripeClient.products.list(
    //     { limit: 20, active: true, expand: ['data.default_price'] },
    //     { stripeAccount: accountId }
    //   )
    //
    // `expand: ['data.default_price']` fetches the full Price object inline,
    // avoiding a separate API call per product to get pricing info.
    //
    // The second argument `{ stripeAccount: ... }` adds the Stripe-Account header,
    // routing this call to the connected account's context.
    const products = await stripeClient.products.list(
      {
        limit: 20,
        active: true,
        expand: ['data.default_price'], // Inline-expand price so we have amount/currency
      },
      {
        stripeAccount: demo.stripeAccountId, // ← Stripe-Account header
      }
    );

    // Normalise to a clean shape for the frontend
    const items = products.data.map((p) => {
      const price = p.default_price as any;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        priceId: price?.id ?? null,
        unitAmount: price?.unit_amount ?? null,   // In smallest currency unit (cents)
        currency: price?.currency ?? 'eur',
      };
    });

    return NextResponse.json({ products: items });
  } catch (error: any) {
    console.error('[connect-demo] List products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new product on the connected account
// ---------------------------------------------------------------------------
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

    const { name, description, unitAmount, currency = 'eur' } = await request.json();

    if (!name || !unitAmount || unitAmount < 50) {
      return NextResponse.json(
        { error: 'name and unitAmount (minimum 50 cents) are required.' },
        { status: 400 }
      );
    }

    const stripeClient = await getStripeClient();

    // ── Create a product with a default price on the connected account ─────
    //
    // `default_price_data` creates a Price object atomically with the Product,
    // saving an extra API call. Amounts are always in the smallest currency
    // unit (e.g. €10.00 = 1000 cents).
    //
    // The `stripeAccount` option passes the Stripe-Account header so the
    // product is created on the connected account, not the platform account.
    const product = await stripeClient.products.create(
      {
        name,
        description: description || undefined,
        default_price_data: {
          unit_amount: Math.round(unitAmount), // Must be an integer
          currency,
        },
      },
      {
        stripeAccount: demo.stripeAccountId, // ← Create on connected account
      }
    );

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        priceId: (product.default_price as any)?.id ?? null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[connect-demo] Create product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
