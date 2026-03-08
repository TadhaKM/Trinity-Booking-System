'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatDate } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface Ticket {
  id: string;
  ticketType: { name: string };
  price: number;
  isRefunded: boolean;
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  event: {
    title: string;
    startDate: string;
  };
}

interface RefundModalProps {
  order: Order;
  tickets: Ticket[];
  onClose: () => void;
  onSuccess: () => void;
}

type RefundMode = 'full' | 'ticket';
type ModalState = 'form' | 'success' | 'loading';

/* ─── Component ──────────────────────────────────────────────────────────────── */

export default function RefundModal({ order, tickets, onClose, onSuccess }: RefundModalProps) {
  const user = useAuthStore((state) => state.user);

  const [mode, setMode] = useState<RefundMode>('full');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [modalState, setModalState] = useState<ModalState>('form');
  const [apiError, setApiError] = useState('');
  const [reasonError, setReasonError] = useState('');

  const eligibleTickets = tickets.filter((t) => !t.isRefunded);

  // Auto-select first eligible ticket when switching to ticket mode
  useEffect(() => {
    if (mode === 'ticket' && !selectedTicketId && eligibleTickets.length > 0) {
      setSelectedTicketId(eligibleTickets[0].id);
    }
  }, [mode, eligibleTickets, selectedTicketId]);

  const selectedTicket = eligibleTickets.find((t) => t.id === selectedTicketId) ?? null;

  const refundAmount =
    mode === 'full' ? order.totalAmount : (selectedTicket?.price ?? 0);

  const validate = (): boolean => {
    if (reason.trim().length < 10) {
      setReasonError('Please provide at least 10 characters explaining the reason.');
      return false;
    }
    setReasonError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) return;

    setApiError('');
    setModalState('loading');

    try {
      const body: Record<string, string> = {
        userId: user.id,
        orderId: order.id,
        reason: reason.trim(),
      };
      if (mode === 'ticket' && selectedTicketId) {
        body.ticketId = selectedTicketId;
      }

      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setModalState('success');
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setApiError(data?.error ?? 'An unexpected error occurred. Please try again.');
        setModalState('form');
      }
    } catch {
      setApiError('Network error. Please check your connection and try again.');
      setModalState('form');
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 font-[Manrope,sans-serif]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-modal-title"
    >
      <div className="bg-white rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex justify-between items-center rounded-t-[2rem]">
          <h2
            id="refund-modal-title"
            className="text-xl font-bold text-[#0A2E6E]"
          >
            Request Refund
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          {/* ── Success state ── */}
          {modalState === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#0A2E6E] mb-2">Request Submitted</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Your refund request has been submitted. We&apos;ll review it within 2–3 business days.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-[#0569b9] text-white font-semibold rounded-2xl hover:bg-[#0A2E6E] transition"
              >
                Close
              </button>
            </div>
          )}

          {/* ── Form / loading state ── */}
          {(modalState === 'form' || modalState === 'loading') && (
            <>
              {/* Order info */}
              <div className="bg-[#EFF2F7] rounded-2xl px-4 py-4 mb-6">
                <p className="font-bold text-[#0A2E6E] text-base leading-tight">
                  {order.event.title}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(order.event.startDate)}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-gray-600 font-medium">Total paid</span>
                  <span className="text-[#0569b9] font-bold text-base">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Refund type */}
              <fieldset className="mb-5">
                <legend className="text-sm font-semibold text-[#0A2E6E] mb-3">
                  Refund type
                </legend>
                <div className="space-y-2">
                  {/* Full order refund */}
                  <label
                    className={`flex items-start gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                      mode === 'full'
                        ? 'border-[#0569b9] bg-[#0569b9]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refund-mode"
                      value="full"
                      checked={mode === 'full'}
                      onChange={() => setMode('full')}
                      className="mt-0.5 accent-[#0569b9]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-800">
                          Full order refund
                        </span>
                        <span className="font-bold text-[#0569b9] text-sm">
                          {formatPrice(order.totalAmount)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Refund all tickets in this order
                      </p>
                    </div>
                  </label>

                  {/* Individual ticket refund */}
                  <label
                    className={`flex items-start gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                      mode === 'ticket'
                        ? 'border-[#0569b9] bg-[#0569b9]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${eligibleTickets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="refund-mode"
                      value="ticket"
                      checked={mode === 'ticket'}
                      onChange={() => setMode('ticket')}
                      disabled={eligibleTickets.length === 0}
                      className="mt-0.5 accent-[#0569b9]"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-gray-800">
                        Individual ticket refund
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Select a specific ticket to refund
                      </p>
                    </div>
                  </label>
                </div>
              </fieldset>

              {/* Ticket selector */}
              {mode === 'ticket' && eligibleTickets.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-[#0A2E6E] mb-2">
                    Select ticket
                  </p>
                  <div className="space-y-2">
                    {eligibleTickets.map((ticket) => (
                      <label
                        key={ticket.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                          selectedTicketId === ticket.id
                            ? 'border-[#0569b9] bg-[#0569b9]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTicketId === ticket.id}
                          onChange={() =>
                            setSelectedTicketId(
                              selectedTicketId === ticket.id ? '' : ticket.id
                            )
                          }
                          className="accent-[#0569b9]"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm text-gray-800 font-medium">
                            {ticket.ticketType.name}
                          </span>
                          <span className="text-sm font-bold text-[#0569b9]">
                            {formatPrice(ticket.price)}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Refund amount summary */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#EFF2F7] rounded-2xl mb-5">
                <span className="text-sm font-medium text-gray-700">Refund amount</span>
                <span className="text-lg font-bold text-[#0A2E6E]">
                  {refundAmount > 0 ? formatPrice(refundAmount) : '—'}
                </span>
              </div>

              {/* Reason textarea */}
              <div className="mb-5">
                <label
                  htmlFor="refund-reason"
                  className="block text-sm font-semibold text-[#0A2E6E] mb-2"
                >
                  Reason for refund <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError && e.target.value.trim().length >= 10) {
                      setReasonError('');
                    }
                  }}
                  placeholder="Please describe why you are requesting a refund…"
                  rows={4}
                  className={`w-full px-4 py-3 text-sm border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 focus:border-[#0569b9] resize-none text-gray-800 placeholder:text-gray-400 bg-white transition-colors ${
                    reasonError ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {reasonError && (
                  <p className="mt-1 text-xs text-red-500">{reasonError}</p>
                )}
              </div>

              {/* API error */}
              {apiError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
                  {apiError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={
                  modalState === 'loading' ||
                  (mode === 'ticket' && !selectedTicketId)
                }
                className="w-full py-3 bg-[#0569b9] text-white font-bold rounded-2xl hover:bg-[#0A2E6E] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {modalState === 'loading' ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  'Request Refund'
                )}
              </button>

              {/* Policy note */}
              <p className="mt-4 text-center text-xs text-gray-400 leading-relaxed">
                Refunds are subject to our refund policy. Processing takes 5–10 business days.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
