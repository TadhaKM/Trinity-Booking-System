'use client';

/**
 * STRIPE CONNECT DEMO — Main Page
 * =================================
 * /connect-demo
 *
 * Demonstrates the full Stripe Connect lifecycle:
 *   1. Create a connected account (V2 API, simulate_accept_tos_obo in sandbox)
 *   2. Onboard the account (hosted account link)
 *   3. Create products and sell them via Direct Charge Checkout
 *   4. Subscribe the account to a platform fee (stripe_balance)
 *
 * This page manages the list of demo connected accounts and lets you create new ones.
 * Each account has its own storefront at /connect-demo/[accountId].
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DemoAccount {
  id: string;
  displayName: string;
  email: string;
  stripeAccountId: string;
  createdAt: string;
  // Live status from Stripe (fetched separately)
  readyToProcessPayments?: boolean;
  onboardingComplete?: boolean;
}

export default function ConnectDemoPage() {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '' });

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/connect-demo/accounts');
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
        // Fetch live status for each account (non-blocking)
        data.accounts.forEach((acc: DemoAccount) => {
          fetchAccountStatus(acc.id);
        });
      }
    } catch {
      setError('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccountStatus(accountId: string) {
    try {
      const res = await fetch(`/api/connect-demo/accounts/${accountId}`);
      if (!res.ok) return;
      const data = await res.json();
      setAccounts(prev =>
        prev.map(a =>
          a.id === accountId
            ? { ...a, readyToProcessPayments: data.readyToProcessPayments, onboardingComplete: data.onboardingComplete }
            : a
        )
      );
    } catch {
      // Silent fail — status is supplementary info
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName || !form.email) return;

    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/connect-demo/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account.');
        return;
      }

      // Reset form and refresh list
      setForm({ displayName: '', email: '' });
      setShowForm(false);
      await fetchAccounts();
    } catch {
      setError('Network error. Is Stripe configured?');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EFF2F7] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <Link href="/" className="text-[#0569b9] text-sm hover:underline mb-4 inline-block">
            ← Back to TCD Tickets
          </Link>
          <h1 className="text-4xl font-bold text-[#0A2E6E] font-['Manrope'] mb-3">
            Stripe Connect Demo
          </h1>
          <p className="text-gray-600 max-w-2xl">
            This demo shows how the TCD Tickets platform uses{' '}
            <strong>Stripe Connect</strong> to let event organisers receive
            payouts and sell tickets. Each account below represents an organiser
            on the platform.
          </p>

          {/* Architecture overview */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: '1',
                title: 'Create Account',
                desc: 'V2 API creates a connected account with simulate_accept_tos_obo for sandbox.',
              },
              {
                step: '2',
                title: 'Onboard',
                desc: 'Stripe-hosted onboarding collects bank details, identity, and tax info.',
              },
              {
                step: '3',
                title: 'Sell + Earn',
                desc: 'Direct Charge checkout splits payments: organiser gets funds, platform takes 10%.',
              },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-white/60">
                <div className="w-8 h-8 rounded-full bg-[#0569b9] text-white text-sm font-bold flex items-center justify-center mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-[#0A2E6E] mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Create Account ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white/60 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#0A2E6E] font-['Manrope']">
              Connected Accounts
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#0569b9] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#0A2E6E] transition-colors"
            >
              + New Account
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-5 bg-[#EFF2F7] rounded-2xl">
              <h3 className="font-semibold text-[#0A2E6E] mb-4">Create Connected Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Trinity Drama Society"
                    value={form.displayName}
                    onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Email</label>
                  <input
                    type="email"
                    placeholder="organiser@example.com"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                In sandbox: account is created with <code>simulate_accept_tos_obo: true</code> (TOS pre-accepted).
                A hosted onboarding link will be generated for the account detail page.
              </p>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-[#0569b9] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#0A2E6E] transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 text-sm px-4 py-2.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Account list */}
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm mb-2">No connected accounts yet.</p>
              <p className="text-gray-300 text-xs">Click "New Account" to create your first demo account.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {accounts.map(account => (
                <div key={account.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#0A2E6E]/10 flex items-center justify-center text-[#0A2E6E] font-bold text-sm">
                      {account.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{account.displayName}</p>
                      <p className="text-sm text-gray-400">{account.email}</p>
                      <p className="text-xs text-gray-300 font-mono">{account.stripeAccountId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Status badge */}
                    {account.readyToProcessPayments !== undefined && (
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        account.readyToProcessPayments
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {account.readyToProcessPayments ? 'Active' : 'Pending setup'}
                      </span>
                    )}
                    <Link
                      href={`/connect-demo/${account.id}`}
                      className="bg-[#0A2E6E] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#0569b9] transition-colors"
                    >
                      View Storefront →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white/60">
          <h2 className="text-xl font-bold text-[#0A2E6E] font-['Manrope'] mb-5">How It Works</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex gap-3">
              <span className="text-[#0569b9] font-bold shrink-0">Direct Charge</span>
              <span>
                When a customer buys a ticket, Stripe charges the connected account directly.
                The platform automatically receives a 10% <code>application_fee_amount</code>.
                Payouts go straight to the organiser's bank account.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#0569b9] font-bold shrink-0">Platform Fee</span>
              <span>
                Each connected account is subscribed to a €29/month platform fee charged via
                <code>stripe_balance</code> — deducted from their Stripe balance automatically.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#0569b9] font-bold shrink-0">V2 API</span>
              <span>
                Accounts are created via <code>stripeClient.v2.core.accounts.create()</code>
                with <code>simulate_accept_tos_obo: true</code> in sandbox, enabling direct
                charge and stripe_balance without manual TOS acceptance.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
