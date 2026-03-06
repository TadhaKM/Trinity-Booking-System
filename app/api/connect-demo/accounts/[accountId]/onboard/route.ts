/**
 * STRIPE CONNECT DEMO — Account Onboarding Link
 * ================================================
 * POST /api/connect-demo/accounts/[accountId]/onboard
 *
 * Creates a short-lived Stripe-hosted onboarding URL using the V2 accountLinks API.
 * The link is single-use and expires after ~10 minutes.
 *
 * When the user visits the link, Stripe walks them through:
 *   1. Identity/business verification (KYC)
 *   2. Bank account setup for payouts
 *   3. Terms of service acceptance
 *
 * After completion (or if they close the tab), Stripe redirects them to
 * return_url or refresh_url respectively.
 *
 * Blueprint reference: create-account-chapter / create-account-link node
 *
 * IMPORTANT: Never store or reuse account link URLs — always generate a fresh
 * one when the user needs to return to onboarding (e.g. if link expired).
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
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const demo = await prisma.connectDemoAccount.findUnique({
      where: { id: accountId },
    });

    if (!demo) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const stripeClient = await getStripeClient();

    // PLACEHOLDER: Set NEXT_PUBLIC_APP_URL in .env for production deployments.
    // e.g. NEXT_PUBLIC_APP_URL=https://yourapp.com
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ── Create a V2 Account Link ───────────────────────────────────────────
    //
    // Blueprint:
    //   const accountLink = await stripeClient.v2.core.accountLinks.create({
    //     account: accountId,
    //     use_case: {
    //       type: 'account_onboarding',
    //       account_onboarding: {
    //         configurations: ['merchant', 'customer'],
    //         refresh_url: 'https://example.com',
    //         return_url: `https://example.com?accountId=${accountId}`,
    //       },
    //     },
    //   });
    //
    // Parameters:
    //   account            The Stripe acct_xxx ID to onboard
    //   use_case.type      'account_onboarding' = collect all required KYC info
    //   configurations     Which configs to onboard:
    //                        'merchant' = ability to accept card payments
    //                        'customer' = ability to be charged platform fees
    //   refresh_url        Redirect here if link expires or is already used —
    //                        your app should generate a fresh link and redirect again
    //   return_url         Redirect here after the user completes (or skips) onboarding
    //                        Include the account ID so you can show the right status
    const accountLink = await (stripeClient as any).v2.core.accountLinks.create({
      account: demo.stripeAccountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['merchant', 'customer'],
          // refresh_url: called when link expires — regenerate and redirect
          refresh_url: `${appUrl}/connect-demo`,
          // return_url: called after onboarding completes or user clicks "Later"
          return_url: `${appUrl}/connect-demo?accountId=${demo.id}&onboarded=1`,
        },
      },
    });

    // Return the URL — the client will redirect the user to this Stripe-hosted page
    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('[connect-demo] Onboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
