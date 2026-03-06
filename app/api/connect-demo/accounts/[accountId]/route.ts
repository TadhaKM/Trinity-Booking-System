/**
 * STRIPE CONNECT DEMO — Account Status
 * =====================================
 * GET /api/connect-demo/accounts/[accountId]
 *
 * Fetches live onboarding and capability status directly from the Stripe V2 API.
 * We ALWAYS fetch fresh from Stripe — never cache this — so the UI accurately
 * reflects the current requirements state (which can change due to regulatory
 * requirements, card network rules, or risk reviews at any time).
 *
 * Blueprint reference: create-account-chapter / wait-for-account-onboard node
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    // accountId here is our internal DB id (not the Stripe acct_xxx ID).
    // In production you'd look this up from your User model.
    const demo = await prisma.connectDemoAccount.findUnique({
      where: { id: accountId },
    });

    if (!demo) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const stripeClient = await getStripeClient();

    // ── Retrieve the V2 account with expanded fields ───────────────────────
    //
    // The `include` parameter fetches nested objects not returned by default:
    //   configuration.merchant  → capability statuses (card_payments, etc.)
    //   requirements            → what information Stripe still needs from the user
    //
    // Blueprint snippet:
    //   const account = await stripeClient.v2.core.accounts.retrieve(stripeAccountId, {
    //     include: ["configuration.merchant", "requirements"],
    //   });
    const account = await (stripeClient as any).v2.core.accounts.retrieve(
      demo.stripeAccountId,
      { include: ['configuration.merchant', 'requirements'] }
    );

    // ── Determine onboarding & payment readiness ───────────────────────────
    //
    // readyToProcessPayments:
    //   true when Stripe has fully verified the account AND activated card_payments.
    //   Until this is true, the account cannot accept live charges.
    const readyToProcessPayments =
      account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';

    // requirementsStatus reflects what Stripe currently needs:
    //   'currently_due'  → Stripe needs info now (soft deadline)
    //   'past_due'       → Overdue — payouts may be paused or disabled
    //   null/undefined   → No outstanding requirements (onboarding complete)
    const requirementsStatus =
      account.requirements?.summary?.minimum_deadline?.status ?? null;

    const onboardingComplete =
      requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

    const currentlyDue: string[] = account.requirements?.summary?.currently_due ?? [];
    const pastDue: string[] = account.requirements?.summary?.past_due ?? [];
    const chargesEnabled = readyToProcessPayments;
    const payoutsEnabled =
      account?.configuration?.merchant?.capabilities?.transfers?.status === 'active' ||
      readyToProcessPayments;

    return NextResponse.json({
      id: demo.id,
      stripeAccountId: demo.stripeAccountId,
      displayName: demo.displayName,
      email: demo.email,
      createdAt: demo.createdAt,
      // Capability & requirements status
      readyToProcessPayments,
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
      requirements: {
        currentlyDue,
        pastDue,
        errors: [],
      },
      // Raw data for debugging
      requirementsStatus,
      capabilities: account?.configuration?.merchant?.capabilities ?? {},
    });
  } catch (error: any) {
    console.error('[connect-demo] Get account status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
