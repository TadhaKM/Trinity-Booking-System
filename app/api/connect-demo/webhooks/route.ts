/**
 * STRIPE CONNECT DEMO — Webhook Handler
 * ======================================
 * POST /api/connect-demo/webhooks
 *
 * Handles two distinct types of Stripe webhook events:
 *
 * ── 1. V2 THIN EVENTS ────────────────────────────────────────────────────────
 *
 * V2 thin events are lightweight notification payloads — they contain only
 * the event type and a resource ID, NOT the full resource data. You must
 * fetch the full resource separately if you need its fields.
 *
 * Why thin events?
 *   - Smaller payloads, faster delivery
 *   - No risk of receiving stale data (you always fetch fresh from Stripe)
 *   - Better security: sensitive data isn't in the webhook body
 *
 * V2 thin events used here:
 *   - v1.stripe_connect.account_closed           — account was closed
 *   - v1.stripe_connect.account_application.authorized   — platform authorised
 *   - v1.stripe_connect.account_application.deauthorized — platform deauthorised
 *   [Note: v2.core.account[requirements].updated is emitted when requirements change]
 *
 * ── 2. V1 SNAPSHOT EVENTS ────────────────────────────────────────────────────
 *
 * V1 snapshot events include the full resource data in the payload (the
 * traditional Stripe webhook format). These are used for payment events
 * because the data is immediately actionable without an extra API call.
 *
 * V1 snapshot events used here:
 *   - checkout.session.completed    — payment captured via hosted checkout
 *   - invoice.payment_succeeded     — subscription invoice paid
 *   - account.updated               — connected account settings changed
 *
 * ── WEBHOOK SIGNATURE VERIFICATION ──────────────────────────────────────────
 *
 * ALWAYS verify the webhook signature. This proves the request came from
 * Stripe and prevents replay attacks / forged payloads.
 *
 * For V2 thin events: use stripeClient.parseThinEvent() (NOT constructEvent)
 * For V1 snapshot events: use stripeClient.webhooks.constructEvent()
 *
 * Two separate webhook endpoints in Stripe Dashboard:
 *   1. V2 endpoint: subscribe to v2.core.* event types
 *   2. V1 endpoint (or same endpoint): subscribe to checkout.session.*, invoice.*, account.*
 *
 * For this demo, we use ONE endpoint that auto-detects the event version
 * based on the presence of the `livemode` field at the top level vs. nested.
 *
 * Env vars required:
 *   STRIPE_WEBHOOK_SECRET        — V1 endpoint signing secret (whsec_...)
 *   STRIPE_WEBHOOK_SECRET_V2     — V2 endpoint signing secret (whsec_...)
 *
 * Blueprint reference: connect-demo / webhook-handler
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
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const stripeClient = await getStripeClient();

  // ── Detect event version ──────────────────────────────────────────────────
  //
  // V2 thin events have a top-level `context` object and use a different
  // JSON schema. V1 snapshot events have a top-level `object` field = 'event'.
  // We try V2 first, fall back to V1.
  let parsedRaw: any;
  try {
    parsedRaw = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const isV2 = parsedRaw?.api_version?.startsWith('v2') || parsedRaw?.context !== undefined;

  if (isV2) {
    return handleV2ThinEvent(body, signature, stripeClient);
  } else {
    return handleV1SnapshotEvent(body, signature, stripeClient);
  }
}

// ── V2 Thin Event Handler ─────────────────────────────────────────────────────

async function handleV2ThinEvent(
  body: string,
  signature: string,
  stripeClient: any
) {
  const webhookSecretV2 = process.env.STRIPE_WEBHOOK_SECRET_V2;
  if (!webhookSecretV2 || webhookSecretV2 === 'YOUR_STRIPE_WEBHOOK_SECRET_V2') {
    console.warn('[webhook-v2] STRIPE_WEBHOOK_SECRET_V2 not configured — skipping signature verification in dev');
    // In production, NEVER skip verification. Return error in non-dev:
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 503 });
    }
  }

  let thinEvent: any;
  try {
    if (webhookSecretV2 && webhookSecretV2 !== 'YOUR_STRIPE_WEBHOOK_SECRET_V2') {
      // Blueprint:
      //   const thinEvent = stripeClient.parseThinEvent(body, sig, secret)
      //
      // parseThinEvent validates the signature and returns a typed thin event.
      // Do NOT use constructEvent for V2 — parseThinEvent is the V2 equivalent.
      thinEvent = stripeClient.parseThinEvent(body, signature, webhookSecretV2);
    } else {
      thinEvent = JSON.parse(body);
    }
  } catch (err: any) {
    console.error('[webhook-v2] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  console.log('[webhook-v2] Received thin event:', thinEvent.type, thinEvent.id);

  // ── Fetch full event data (thin → full) ───────────────────────────────────
  //
  // Blueprint:
  //   const fullEvent = await stripeClient.v2.core.events.retrieve(thinEvent.id)
  //
  // The thin event only has a resource ID. To get all fields, we fetch
  // the full event via the V2 events API. This ensures we always have
  // the most up-to-date data at the time of processing.
  let fullEvent: any = thinEvent;
  try {
    fullEvent = await stripeClient.v2.core.events.retrieve(thinEvent.id);
  } catch (err: any) {
    console.warn('[webhook-v2] Could not fetch full event, using thin:', err.message);
  }

  switch (thinEvent.type) {
    // ── Account requirements changed ────────────────────────────────────────
    // Fired when a connected account's verification requirements are updated
    // (e.g., KYC documents requested, restrictions added/removed).
    case 'v1.stripe_connect.account_closed':
    case 'v2.core.account[requirements].updated': {
      const accountId = fullEvent?.data?.object?.id ?? fullEvent?.related_object?.id;
      if (accountId) {
        console.log('[webhook-v2] Account requirements updated:', accountId);
        // Sync payoutsEnabled status for this account
        await syncAccountStatus(accountId, stripeClient);
      }
      break;
    }

    // ── Platform authorised/deauthorised ────────────────────────────────────
    // account_application.authorized: connected account authorised your platform
    // account_application.deauthorized: they disconnected from your platform
    case 'v1.stripe_connect.account_application.authorized': {
      console.log('[webhook-v2] Account authorised platform access:', fullEvent?.related_object?.id);
      break;
    }

    case 'v1.stripe_connect.account_application.deauthorized': {
      const stripeAccountId = fullEvent?.related_object?.id;
      if (stripeAccountId) {
        console.log('[webhook-v2] Account deauthorised — clearing Connect data:', stripeAccountId);
        // In a real app: remove stripeConnectId from your user record
        await prisma.user.updateMany({
          where: { stripeConnectId: stripeAccountId },
          data: { stripeConnectId: null, payoutsEnabled: false },
        });
      }
      break;
    }

    default:
      console.log('[webhook-v2] Unhandled V2 event type:', thinEvent.type);
  }

  return NextResponse.json({ received: true, type: thinEvent.type });
}

// ── V1 Snapshot Event Handler ─────────────────────────────────────────────────

async function handleV1SnapshotEvent(
  body: string,
  signature: string,
  stripeClient: any
) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'YOUR_STRIPE_WEBHOOK_SECRET') {
    console.warn('[webhook-v1] STRIPE_WEBHOOK_SECRET not configured — skipping verification in dev');
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 503 });
    }
  }

  let event: any;
  try {
    if (webhookSecret && webhookSecret !== 'YOUR_STRIPE_WEBHOOK_SECRET') {
      // Blueprint:
      //   const event = stripeClient.webhooks.constructEvent(body, sig, secret)
      //
      // constructEvent is V1's signature verification method.
      // It throws StripeSignatureVerificationError if the signature is invalid.
      event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error('[webhook-v1] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  console.log('[webhook-v1] Received snapshot event:', event.type, event.id);

  switch (event.type) {
    // ── Checkout session completed ───────────────────────────────────────────
    // Fired when a customer completes a Hosted Checkout session.
    // The full session data is in event.data.object.
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('[webhook-v1] Checkout completed:', session.id, 'status:', session.payment_status);

      if (session.payment_status === 'paid') {
        // In a real app: fulfil the order, send confirmation email, etc.
        // session.metadata contains any custom data you passed when creating the session
        console.log('[webhook-v1] Payment captured, metadata:', session.metadata);
      }
      break;
    }

    // ── Subscription invoice paid ────────────────────────────────────────────
    // Fired when a subscription's recurring invoice is successfully paid.
    // This includes both the initial payment and all subsequent renewals.
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      console.log('[webhook-v1] Invoice paid:', invoice.id, 'subscription:', invoice.subscription);
      // In a real app: update subscription status in DB, grant access, etc.
      break;
    }

    // ── Invoice payment failed ───────────────────────────────────────────────
    // Fired when a subscription invoice payment fails.
    // Stripe will retry automatically per your retry settings.
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.error('[webhook-v1] Invoice payment failed:', invoice.id);
      // In a real app: notify the organiser, potentially suspend their account
      break;
    }

    // ── Connected account updated ────────────────────────────────────────────
    // Fired when a connected account's details change (e.g., after onboarding).
    // Check charges_enabled and payouts_enabled to update your DB.
    case 'account.updated': {
      const account = event.data.object;
      console.log('[webhook-v1] Account updated:', account.id,
        'charges_enabled:', account.charges_enabled,
        'payouts_enabled:', account.payouts_enabled);

      // Sync the payoutsEnabled flag in our User table
      if (account.id) {
        await prisma.user.updateMany({
          where: { stripeConnectId: account.id },
          data: { payoutsEnabled: account.payouts_enabled ?? false },
        });
      }
      break;
    }

    default:
      console.log('[webhook-v1] Unhandled V1 event type:', event.type);
  }

  return NextResponse.json({ received: true, type: event.type });
}

// ── Helper: sync account status ───────────────────────────────────────────────

async function syncAccountStatus(stripeAccountId: string, stripeClient: any) {
  try {
    const account = await stripeClient.accounts.retrieve(stripeAccountId);
    await prisma.user.updateMany({
      where: { stripeConnectId: stripeAccountId },
      data: { payoutsEnabled: account.payouts_enabled ?? false },
    });
    console.log('[webhook] Synced account status for:', stripeAccountId,
      'payoutsEnabled:', account.payouts_enabled);
  } catch (err: any) {
    console.error('[webhook] Failed to sync account status:', err.message);
  }
}
