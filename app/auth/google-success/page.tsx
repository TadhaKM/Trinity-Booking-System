'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

function GoogleSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) {
      router.replace('/login?error=auth_failed');
      return;
    }
    try {
      const user = JSON.parse(atob(data));
      login(user, false);
      router.replace('/');
    } catch {
      router.replace('/login?error=auth_failed');
    }
  }, [searchParams, login, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EFF2F7]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#1A6FEF] animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Signing you in with Google…</p>
      </div>
    </div>
  );
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#EFF2F7]">
        <div className="w-16 h-16 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#1A6FEF] animate-spin" />
      </div>
    }>
      <GoogleSuccessContent />
    </Suspense>
  );
}
