'use client';

import { useState } from 'react';

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative z-50 bg-[#0A2E6E] text-white text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-3 flex-shrink-0">
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>

      <span className="text-white/90">
        <strong className="text-white font-semibold">Demo Mode</strong>
        {' — '}This is a demonstration of TCD Tickets.
        {' '}Accounts get <strong>8 AI messages</strong>, <strong>5 bookings</strong>, and <strong>3 events</strong>.
        {' '}Payments use Stripe test mode — <strong>no real charges</strong>.
      </span>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss demo banner"
        className="ml-2 flex-shrink-0 p-1 rounded hover:bg-white/10 transition text-white/60 hover:text-white"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
