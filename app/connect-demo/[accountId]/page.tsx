'use client';

/**
 * STRIPE CONNECT DEMO — Per-Account Storefront
 * ==============================================
 * /connect-demo/[accountId]
 *
 * Shows the connected account's "storefront" — products they've created
 * and the ability to purchase via Direct Charge Checkout.
 *
 * Also lets the account owner:
 *   - Complete onboarding (if incomplete)
 *   - Add products (created on the connected account via stripeAccount header)
 *   - Subscribe to the platform plan (stripe_balance)
 *   - View their Stripe account status
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface AccountStatus {
  id: string;
  displayName: string;
  email: string;
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirements: {
    currentlyDue: string[];
    pastDue: string[];
    errors: any[];
  };
}

interface Product {
  id: string;
  name: string;
  description?: string;
  defaultPrice?: {
    id: string;
    unitAmount: number;
    currency: string;
  };
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: number;
  amount: number;
  currency: string;
  interval: string;
}

export default function AccountStorefront({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = use(params);

  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [subError, setSubError] = useState('');
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    unitAmount: '',
    currency: 'eur',
  });

  useEffect(() => {
    loadAll();
  }, [accountId]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchProducts(), fetchSubscription()]);
    setLoading(false);
  }

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/connect-demo/accounts/${accountId}`);
      if (res.ok) setStatus(await res.json());
    } catch { /* silent */ }
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`/api/connect-demo/accounts/${accountId}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
      }
    } catch { /* silent */ }
  }

  async function fetchSubscription() {
    try {
      const res = await fetch(`/api/connect-demo/subscription?accountId=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        const active = data.subscriptions?.find((s: any) =>
          s.status === 'active' || s.status === 'trialing'
        );
        if (active) {
          setSubscription({
            id: active.id,
            status: active.status,
            currentPeriodEnd: active.current_period_end,
            amount: 2900,
            currency: 'eur',
            interval: 'month',
          });
        }
      }
    } catch { /* silent */ }
  }

  async function handleOnboard() {
    setOnboarding(true);
    try {
      const res = await fetch(`/api/connect-demo/accounts/${accountId}/onboard`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to generate onboarding link.');
    } catch {
      alert('Network error.');
    } finally {
      setOnboarding(false);
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    setSubError('');
    try {
      const res = await fetch('/api/connect-demo/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscription(data.subscription);
      } else {
        setSubError(data.error || 'Failed to create subscription.');
      }
    } catch {
      setSubError('Network error.');
    } finally {
      setSubscribing(false);
    }
  }

  async function handlePurchase(product: Product) {
    if (!product.defaultPrice) return;
    setPurchasing(product.id);
    try {
      const res = await fetch(`/api/connect-demo/accounts/${accountId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: product.defaultPrice.id,
          unitAmount: product.defaultPrice.unitAmount,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to create checkout session.');
    } catch {
      alert('Network error.');
    } finally {
      setPurchasing(null);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setCreatingProduct(true);
    try {
      const res = await fetch(`/api/connect-demo/accounts/${accountId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          unitAmount: Math.round(parseFloat(productForm.unitAmount) * 100),
          currency: productForm.currency,
        }),
      });
      const data = await res.json();
      if (data.product) {
        setShowProductForm(false);
        setProductForm({ name: '', description: '', unitAmount: '', currency: 'eur' });
        await fetchProducts();
      } else {
        alert(data.error || 'Failed to create product.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setCreatingProduct(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center">
        <p className="text-gray-400">Loading account...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Account not found.</p>
          <Link href="/connect-demo" className="text-[#0569b9] hover:underline">← Back to demo</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFF2F7] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <Link href="/connect-demo" className="text-[#0569b9] text-sm hover:underline mb-6 inline-block">
          ← All accounts
        </Link>

        {/* ── Account header ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white/60 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0A2E6E] flex items-center justify-center text-white font-bold text-xl">
                {status.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0A2E6E] font-['Manrope']">
                  {status.displayName}
                </h1>
                <p className="text-gray-400 text-sm">{status.email}</p>
                <p className="text-xs text-gray-300 font-mono mt-0.5">{status.stripeAccountId}</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                status.chargesEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {status.chargesEnabled ? '✓ Charges enabled' : '✗ Charges disabled'}
              </span>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                status.payoutsEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {status.payoutsEnabled ? '✓ Payouts enabled' : '✗ Payouts disabled'}
              </span>
            </div>
          </div>

          {/* Onboarding prompt */}
          {!status.onboardingComplete && (
            <div className="mt-6 p-5 bg-amber-50 border border-amber-100 rounded-2xl">
              <p className="text-amber-800 font-semibold text-sm mb-1">Onboarding incomplete</p>
              <p className="text-amber-700 text-sm mb-3">
                This account needs to complete Stripe onboarding before it can accept payments.
                {status.requirements.currentlyDue.length > 0 && (
                  <span> Required: {status.requirements.currentlyDue.slice(0, 3).join(', ')}
                    {status.requirements.currentlyDue.length > 3 && ` +${status.requirements.currentlyDue.length - 3} more`}
                  </span>
                )}
              </p>
              <button
                onClick={handleOnboard}
                disabled={onboarding}
                className="bg-amber-600 text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {onboarding ? 'Redirecting...' : 'Complete Onboarding →'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Products / Storefront ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white/60">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-[#0A2E6E] font-['Manrope']">Products</h2>
                <button
                  onClick={() => setShowProductForm(!showProductForm)}
                  className="bg-[#0569b9] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#0A2E6E] transition-colors"
                >
                  + Add Product
                </button>
              </div>

              {/* Product form */}
              {showProductForm && (
                <form onSubmit={handleCreateProduct} className="mb-6 p-5 bg-[#EFF2F7] rounded-2xl">
                  <h3 className="font-semibold text-[#0A2E6E] text-sm mb-4">New Product</h3>
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      placeholder="Product name (e.g. VIP Ticket)"
                      value={productForm.name}
                      onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={productForm.description}
                      onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                    />
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Price (e.g. 25.00)"
                        step="0.01"
                        min="0.50"
                        value={productForm.unitAmount}
                        onChange={e => setProductForm(p => ({ ...p, unitAmount: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                        required
                      />
                      <select
                        value={productForm.currency}
                        onChange={e => setProductForm(p => ({ ...p, currency: e.target.value }))}
                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 bg-white"
                      >
                        <option value="eur">EUR €</option>
                        <option value="usd">USD $</option>
                        <option value="gbp">GBP £</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Created on the connected account via <code>stripeAccount</code> header.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={creatingProduct}
                      className="bg-[#0569b9] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#0A2E6E] transition-colors disabled:opacity-50"
                    >
                      {creatingProduct ? 'Creating...' : 'Create Product'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="text-gray-400 text-sm px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Product list */}
              {products.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  No products yet. Add one to start selling.
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:border-[#0569b9]/20 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-gray-400 mt-0.5">{product.description}</p>
                        )}
                        {product.defaultPrice && (
                          <p className="text-sm font-bold text-[#0569b9] mt-1">
                            {(product.defaultPrice.unitAmount / 100).toFixed(2)}{' '}
                            {product.defaultPrice.currency.toUpperCase()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handlePurchase(product)}
                        disabled={!product.defaultPrice || purchasing === product.id || !status.readyToProcessPayments}
                        className="bg-[#0A2E6E] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#0569b9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {purchasing === product.id ? 'Redirecting...' : 'Buy Now'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar: Platform Subscription ───────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white/60">
              <h2 className="text-base font-bold text-[#0A2E6E] font-['Manrope'] mb-4">
                Platform Subscription
              </h2>

              {subscription ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${
                      subscription.status === 'active' ? 'bg-green-500' : 'bg-amber-500'
                    }`} />
                    <span className="text-sm font-semibold capitalize">{subscription.status}</span>
                  </div>
                  <p className="text-2xl font-bold text-[#0A2E6E]">
                    €{(subscription.amount / 100).toFixed(2)}
                    <span className="text-sm font-normal text-gray-400">/month</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Charged via <code>stripe_balance</code>
                  </p>
                  {subscription.currentPeriodEnd && (
                    <p className="text-xs text-gray-400 mt-1">
                      Renews {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    Subscribe this account to the platform plan.
                    Charges €29/month from their Stripe balance.
                  </p>
                  {subError && (
                    <div className="mb-3 p-3 bg-red-50 text-red-600 text-xs rounded-xl">
                      {subError}
                    </div>
                  )}
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full bg-[#0569b9] text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-[#0A2E6E] transition-colors disabled:opacity-50"
                  >
                    {subscribing ? 'Subscribing...' : 'Subscribe — €29/mo'}
                  </button>
                  <p className="text-xs text-gray-300 mt-2 text-center">
                    Uses <code>stripe_balance</code> payment method
                  </p>
                </div>
              )}
            </div>

            {/* Technical notes */}
            <div className="bg-[#0A2E6E] rounded-[2rem] p-6 text-white">
              <h3 className="font-semibold text-sm mb-3 text-white/80">Technical Notes</h3>
              <div className="space-y-2 text-xs text-white/60">
                <p>• <strong className="text-white/90">Direct Charge</strong>: Checkout created with <code>stripeAccount</code> header</p>
                <p>• <strong className="text-white/90">App fee</strong>: 10% via <code>application_fee_amount</code></p>
                <p>• <strong className="text-white/90">Subscription</strong>: Uses <code>customer_account</code> + <code>stripe_balance</code></p>
                <p>• <strong className="text-white/90">Webhooks</strong>: V2 thin events + V1 snapshots at <code>/api/connect-demo/webhooks</code></p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
