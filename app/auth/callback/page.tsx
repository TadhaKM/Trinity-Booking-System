'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        const hash = window.location.hash;
        const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');

        if (!sessionId) {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          router.push('/login?error=auth_failed');
          return;
        }

        const userData = await res.json();
        login(userData, true);
        router.push('/');
      } catch {
        router.push('/login?error=auth_failed');
      }
    };

    processAuth();
  }, [router, login]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EFF2F7]" data-testid="auth-callback">
      <div className="text-center">
        <div className="relative mx-auto mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#1A6FEF] animate-spin" />
        </div>
        <p className="text-[#0A2E6E] font-semibold text-lg">Signing you in...</p>
        <p className="text-slate-400 text-sm mt-1">Hang tight, this will only take a moment</p>
      </div>
    </div>
  );
}
