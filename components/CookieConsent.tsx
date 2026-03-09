'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-[#0A2E6E] text-white rounded-2xl shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm leading-relaxed text-white/90">
          <span className="font-semibold text-white">This site uses cookies</span>
          {' '}to keep you signed in and improve your experience.
          {' '}See our{' '}
          <Link href="/privacy" className="underline hover:text-white font-medium">
            Privacy Policy
          </Link>
          {' '}for details.
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm rounded-full border border-white/30 text-white/70 hover:border-white/60 hover:text-white transition"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm rounded-full bg-white text-[#0A2E6E] font-semibold hover:bg-[#EFF2F7] transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
