'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuthStore();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  useEffect(() => {
    emailRef.current?.focus();
    setTimeout(() => setMounted(true), 50);
    // Check for auth error from callback
    const authError = searchParams.get('error');
    if (authError === 'auth_failed') {
      setError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  const handleKeyEvent = (e: React.KeyboardEvent) => {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      login(data, rememberMe);
      router.push('/');
    } catch {
      setError('Unable to connect. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#EFF2F7]">
        <div className="w-16 h-16 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#1A6FEF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFF2F7] flex" data-testid="login-page">
      {/* Left Panel - Solid navy with texture */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A2E6E] items-center justify-center p-12">
        {/* Subtle grain texture */}
        <div className="absolute inset-0 noise-overlay" />
        {/* Accent shapes — solid, no gradients */}
        <div className="absolute top-16 right-16 w-64 h-64 border border-white/8 rounded-full" />
        <div className="absolute top-20 right-20 w-56 h-56 border border-white/5 rounded-full" />
        <div className="absolute bottom-16 left-16 w-40 h-40 border border-[#59D4C8]/15 rounded-3xl rotate-12" />
        <div className="absolute top-1/3 left-12 w-3 h-3 bg-[#59D4C8] rounded-full opacity-40" />
        <div className="absolute bottom-1/3 right-24 w-2 h-2 bg-[#F5A623] rounded-full opacity-50" />

        <div className={`relative z-10 max-w-md transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-14 group" data-testid="login-logo">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-black text-xl">T</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white tracking-tight">TCD</span>
              <span className="text-2xl font-bold text-white/50 ml-1">Tickets</span>
            </div>
          </Link>

          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6 text-balance">
            Welcome<br />back to<br />
            <span className="text-[#59D4C8]">campus life.</span>
          </h2>
          <p className="text-white/40 text-lg leading-relaxed mb-10">
            Sign in to browse events, manage your tickets, and connect with Trinity societies.
          </p>

          {/* Campus image */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            <img
              src="https://cdn.britannica.com/30/242230-050-8A280600/Dublin-Ireland-Trinity-College.jpg"
              alt="Trinity College Dublin"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-[#0A2E6E]/40" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#59D4C8] rounded-full animate-pulse" />
                  <span className="text-white/80 text-sm font-semibold">Live events happening now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={`max-w-md w-full transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5" data-testid="login-logo-mobile">
              <div className="w-10 h-10 rounded-xl bg-[#0A2E6E] flex items-center justify-center shadow-md">
                <span className="text-white font-black text-sm">T</span>
              </div>
              <span className="text-2xl font-black text-[#0A2E6E]">TCD<span className="text-[#1A6FEF]/70 font-bold ml-0.5">Tickets</span></span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-[#0A2E6E] tracking-tight" data-testid="login-heading">Sign in</h1>
            <p className="text-slate-500 mt-2">Enter your credentials to access your account</p>
          </div>

          <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8" data-testid="login-form-card">
            {/* Google Auth Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              data-testid="login-google-btn"
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {googleLoading ? (
                <svg className="animate-spin h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">or sign in with email</span></div>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" data-testid="login-error" className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-semibold text-[#0A2E6E] mb-2">Email address</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <input ref={emailRef} id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }} onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent} disabled={loading} placeholder="you@tcd.ie" data-testid="login-email-input" className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-[#0A2E6E] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A6FEF]/30 focus:border-[#1A6FEF] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50/50 hover:bg-white hover:border-slate-300" />
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor="password" className="block text-sm font-semibold text-[#0A2E6E] mb-2">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }} onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent} disabled={loading} placeholder="Enter your password" data-testid="login-password-input" className="w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-xl text-[#0A2E6E] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A6FEF]/30 focus:border-[#1A6FEF] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50/50 hover:bg-white hover:border-slate-300" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} data-testid="login-toggle-password" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1A6FEF] transition-colors p-1 rounded-lg hover:bg-[#1A6FEF]/5" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {capsLock && (
                  <p className="mt-2 text-sm text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg" role="alert">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    Caps Lock is on
                  </p>
                )}
              </div>

              <div className="flex items-center mb-7">
                <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={loading} data-testid="login-remember-checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1A6FEF] focus:ring-[#1A6FEF] cursor-pointer" />
                <label htmlFor="remember-me" className="ml-2.5 text-sm text-slate-600 cursor-pointer select-none">Remember me</label>
              </div>

              <button type="submit" disabled={loading || !email.trim() || !password} data-testid="login-submit-btn" className="w-full bg-[#0A2E6E] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-[#0E4BAF] focus:outline-none focus:ring-2 focus:ring-[#1A6FEF] focus:ring-offset-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#0A2E6E]/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Signing in...
                  </>
                ) : (
                  <>Sign in<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/signup" data-testid="login-signup-link" className="text-[#1A6FEF] font-semibold hover:text-[#0A2E6E] transition-colors">Create one</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#EFF2F7]"><div className="w-16 h-16 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#1A6FEF] animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
