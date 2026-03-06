'use client';

import { useState } from 'react';

interface SendTicketModalProps {
  ticketId: string;
  ticketName: string;
  eventTitle: string;
  senderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendTicketModal({
  ticketId,
  ticketName,
  eventTitle,
  senderId,
  onClose,
  onSuccess,
}: SendTicketModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId, recipientEmail: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Transfer failed. Please try again.');
      } else {
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-2xl w-full max-w-md p-7">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon + heading */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[#0569b9]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-[#0569b9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0A2E6E]">Send Ticket</h2>
            <p className="text-sm text-slate-500 mt-0.5">Transfer this ticket to a friend</p>
          </div>
        </div>

        {/* Ticket summary */}
        <div className="bg-[#EFF2F7] rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0569b9] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#0A2E6E] text-sm">{ticketName}</p>
              <p className="text-xs text-slate-500 mt-0.5">{eventTitle}</p>
            </div>
          </div>
        </div>

        {status === 'success' ? (
          /* Success state */
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-green-700 text-sm">{message}</p>
            <p className="text-xs text-slate-500">Closing…</p>
          </div>
        ) : (
          <>
            {/* Email input */}
            <label className="block text-sm font-bold text-[#0A2E6E] mb-2">
              Friend&apos;s email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setMessage(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="friend@tcd.ie"
              disabled={status === 'loading'}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 focus:border-[#0569b9] transition-all disabled:opacity-50 bg-white text-[#0A2E6E] placeholder:text-slate-400"
              autoFocus
            />

            {/* Error message */}
            {status === 'error' && (
              <div className="mt-3 flex items-start gap-2 text-red-600 text-sm bg-red-50 px-3 py-2.5 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {message}
              </div>
            )}

            {/* Warning */}
            <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              This action is permanent and cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                disabled={status === 'loading'}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={status === 'loading' || !email.trim()}
                className="flex-1 py-3 rounded-xl bg-[#0569b9] text-white text-sm font-bold hover:bg-[#0A2E6E] transition-all duration-200 shadow-lg shadow-[#0569b9]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Ticket
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
