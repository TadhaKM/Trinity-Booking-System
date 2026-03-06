'use client';

/**
 * STRIPE CONNECT DEMO — Purchase Success Page
 * ============================================
 * /connect-demo/success?session_id=...&accountId=...
 *
 * Stripe redirects here after a successful Hosted Checkout payment.
 * The `session_id` query parameter is automatically filled in by Stripe
 * when the customer is redirected (it replaces the {CHECKOUT_SESSION_ID}
 * template variable we set in the checkout session's success_url).
 *
 * In a production app you would:
 *   1. Verify the session server-side using stripe.checkout.sessions.retrieve(sessionId)
 *   2. Check payment_status === 'paid' before fulfilling the order
 *   3. Never trust client-side success_url parameters alone for fulfilment
 *
 * For this demo, we simply display the session ID and provide links back
 * to the storefront and main demo page.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const accountId = searchParams.get('accountId');

  return (
    <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Success card */}
        <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-white/60 text-center">
          {/* Checkmark icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#0A2E6E] font-['Manrope'] mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Your direct charge payment was processed successfully via Stripe Connect.
          </p>

          {/* Session ID */}
          {sessionId && (
            <div className="bg-[#EFF2F7] rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-400 mb-1">Checkout Session ID</p>
              <p className="text-xs font-mono text-gray-700 break-all">{sessionId}</p>
            </div>
          )}

          {/* How the payment was split */}
          <div className="bg-[#EFF2F7] rounded-2xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-[#0A2E6E] mb-3">Payment Split</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Organiser received</span>
                <span className="font-semibold text-green-700">90%</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform fee (TCD Tickets)</span>
                <span className="font-semibold text-[#0569b9]">10%</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Charged directly on the connected account via{' '}
                <code>application_fee_amount</code>. The organiser is the merchant of record.
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <div className="flex flex-col gap-3">
            {accountId && (
              <Link
                href={`/connect-demo/${accountId}`}
                className="w-full bg-[#0569b9] text-white font-semibold py-3 rounded-full hover:bg-[#0A2E6E] transition-colors text-sm"
              >
                Back to Storefront
              </Link>
            )}
            <Link
              href="/connect-demo"
              className="w-full bg-[#EFF2F7] text-[#0A2E6E] font-semibold py-3 rounded-full hover:bg-gray-200 transition-colors text-sm"
            >
              All Accounts
            </Link>
            <Link
              href="/"
              className="text-gray-400 text-sm hover:underline"
            >
              Back to TCD Tickets
            </Link>
          </div>
        </div>

        {/* Production note */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700">
          <strong>Production note:</strong> Always verify payment server-side via{' '}
          <code>stripe.checkout.sessions.retrieve(session_id)</code> and check{' '}
          <code>payment_status === 'paid'</code> before fulfilling orders. Never rely
          solely on the redirect URL.
        </div>

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
