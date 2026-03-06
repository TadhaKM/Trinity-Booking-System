/**
 * STRIPE CONNECT DEMO — Account Management
 * =========================================
 * GET  /api/connect-demo/accounts  → List all demo connected accounts
 * POST /api/connect-demo/accounts  → Create a new V2 connected account
 *
 * REQUIRED ENV VARS (.env):
 *   STRIPE_SECRET_KEY=sk_test_...   ← Get from https://dashboard.stripe.com/apikeys
 *
 * Blueprint reference: create-account-chapter / create-account node
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Helper: create a Stripe client instance
// We intentionally do NOT set apiVersion — the SDK uses its built-in default.
// ---------------------------------------------------------------------------
async function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  // PLACEHOLDER: Add STRIPE_SECRET_KEY to your .env file.
  // Obtain your key at: https://dashboard.stripe.com/apikeys
  if (!secretKey || secretKey === 'YOUR_STRIPE_SECRET_KEY') {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. ' +
      'Add it to your .env file: STRIPE_SECRET_KEY=sk_test_...'
    );
  }

  const Stripe = (await import('stripe')).default;
  return new Stripe(secretKey);
}

// ---------------------------------------------------------------------------
// GET — return all demo connected accounts from the database
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const accounts = await prisma.connectDemoAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('[connect-demo] List accounts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new Stripe Connect V2 account
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const { displayName, email, country = 'ie' } = await request.json();

    if (!displayName || !email) {
      return NextResponse.json(
        { error: 'displayName and email are required.' },
        { status: 400 }
      );
    }

    const stripeClient = await getStripeClient();

    // ── Step 1: Create a V2 connected account ──────────────────────────────
    //
    // The V2 API replaces the old type:'express'/'standard'/'custom' model.
    // Instead, you define capabilities through `configuration` objects.
    //
    // Key parameters (from blueprint):
    //
    //   display_name                    Shown on the Stripe dashboard & receipts
    //   contact_email                   Stripe uses this for account communications
    //   identity.country                Business country (ISO 3166-1 alpha-2)
    //   identity.business_details.phone Required by some countries for KYC
    //
    //   dashboard: 'full'               Gives the connected account a full
    //                                   Stripe Express dashboard to view payouts
    //
    //   defaults.responsibilities       Who handles fees and fraud losses:
    //     fees_collector: 'stripe'      Stripe collects card network fees
    //     losses_collector: 'stripe'    Stripe absorbs fraud/chargeback losses
    //
    //   configuration.merchant          Enables the account to accept card payments
    //     simulate_accept_tos_obo: true SANDBOX ONLY — simulates automatic TOS
    //                                   acceptance so you can test without real KYC.
    //                                   REMOVE this in production; use account links
    //                                   to collect real KYC from the user instead.
    //
    //   configuration.customer: {}      Configures the account as a "customer" on
    //                                   your platform so you can charge it subscription
    //                                   fees via the Stripe Balance payment method.
    //
    //   include: [...]                  Expands nested objects in the response
    //
    const account = await (stripeClient as any).v2.core.accounts.create({
      display_name: displayName,
      contact_email: email,
      configuration: {
        merchant: {
          // SANDBOX ONLY: auto-accepts TOS for testing.
          // In production, use account links for real KYC onboarding.
          simulate_accept_tos_obo: true,
        },
        // Empty object enables the customer configuration so we can charge
        // this account subscription fees via stripe_balance later.
        customer: {},
      },
      include: [
        'configuration.merchant',
        'configuration.recipient',
        'identity',
        'defaults',
        'configuration.customer',
      ],
      identity: {
        country,
        business_details: {
          phone: '0000000000', // Placeholder phone for sandbox — use real data in production
        },
      },
      dashboard: 'full',
      defaults: {
        responsibilities: {
          losses_collector: 'stripe', // Stripe absorbs fraud losses
          fees_collector: 'stripe',   // Stripe collects card network fees
        },
      },
    });

    // ── Step 2: Persist the account ID ──────────────────────────────────────
    //
    // Store a mapping from our internal record to the Stripe account ID.
    // In a real integration, you'd add stripeAccountId to your User model
    // instead of a separate ConnectDemoAccount table.
    const saved = await prisma.connectDemoAccount.create({
      data: {
        stripeAccountId: account.id, // e.g. acct_1AbCdEfGhIjKlMnO
        displayName,
        email,
      },
    });

    return NextResponse.json({ ...saved, stripeAccount: account }, { status: 201 });
  } catch (error: any) {
    console.error('[connect-demo] Create account error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
