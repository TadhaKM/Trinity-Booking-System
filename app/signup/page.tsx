'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

export default function SignupPage() {
  const router = useRouter();
  const { user, login } = useAuthStore();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'organiser'>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [capsLock, setCapsLock] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  useEffect(() => {
    nameRef.current?.focus();
    setTimeout(() => setMounted(true), 50);
  }, []);

  const handleKeyEvent = (e: React.KeyboardEvent) => {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  };

  const validateField = (field: string, value: string) => {
    const errors: Record<string, string> = { ...fieldErrors };
    switch (field) {
      case 'name':
        if (value.trim().length > 0 && value.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
        else if (value.trim().length > 100) errors.name = 'Name must be less than 100 characters.';
        else delete errors.name;
        break;
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value.trim().length > 0 && !emailRegex.test(value.trim())) errors.email = 'Please enter a valid email address.';
        else delete errors.email;
        break;
      }
      case 'password':
        if (value.length > 0 && value.length < 8) errors.password = 'Password must be at least 8 characters.';
        else if (value.length > 128) errors.password = 'Password must be less than 128 characters.';
        else delete errors.password;
        if (confirmPassword && value !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
        else if (confirmPassword) delete errors.confirmPassword;
        break;
      case 'confirmPassword':
        if (value.length > 0 && value !== password) errors.confirmPassword = 'Passwords do not match.';
        else delete errors.confirmPassword;
        break;
    }
    setFieldErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required.';
    else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    if (!email.trim()) errors.email = 'Email is required.';
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) errors.email = 'Please enter a valid email address.';
    }
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, confirmPassword, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setFieldErrors({ email: data.error });
        else setError(data.details || data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      login(data, false);
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

  const inputBase = "w-full pl-12 pr-4 py-3.5 border rounded-xl text-[#0A2E6E] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A6FEF]/30 focus:border-[#1A6FEF] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50/50 hover:bg-white hover:border-slate-300";

  return (
    <div className="min-h-screen bg-[#EFF2F7] flex" data-testid="signup-page">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0A2E6E] via-[#1A6FEF] to-[#59D4C8] items-center justify-center p-12">
        {/* Animated blobs */}
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] bg-[#59D4C8]/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-[50%] left-[30%] w-[200px] h-[200px] bg-[#F5A623]/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />

        <div className={`relative z-10 max-w-md transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12 group" data-testid="signup-logo">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 border border-white/20">
              <span className="text-white font-black text-xl">T</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white tracking-tight">TCD</span>
              <span className="text-2xl font-bold text-white/70 ml-1">Tickets</span>
            </div>
          </Link>

          {/* Tagline */}
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6 text-balance">
            Join the<br />Trinity<br />
            <span className="text-gradient-mint">community.</span>
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Create your account to discover events, buy tickets, and be part of everything happening on campus.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', text: 'Book tickets instantly' },
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', text: 'Connect with 50+ societies' },
              { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', text: 'Never miss campus events' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: `${400 + i * 150}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/10">
                  <svg className="w-5 h-5 text-[#A8EDEA]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                </div>
                <span className="text-white/80 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className={`max-w-md w-full transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5" data-testid="signup-logo-mobile">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A6FEF] to-[#0A2E6E] flex items-center justify-center shadow-md">
                <span className="text-white font-black text-sm">T</span>
              </div>
              <span className="text-2xl font-black text-[#0A2E6E]">TCD<span className="text-[#1A6FEF]/70 font-bold ml-0.5">Tickets</span></span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-black text-[#0A2E6E] tracking-tight" data-testid="signup-heading">Create account</h1>
            <p className="text-slate-500 mt-2">Fill in your details to get started</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-7" data-testid="signup-form-card">
            {error && (
              <div role="alert" aria-live="assertive" data-testid="signup-error" className="mb-5 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Role Selection */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-[#0A2E6E] mb-2.5">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['customer', 'organiser'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      disabled={loading}
                      data-testid={`signup-role-${r}`}
                      className={`py-3.5 px-4 rounded-xl border-2 font-semibold transition-all duration-300 text-sm ${
                        role === r
                          ? 'border-[#1A6FEF] bg-[#1A6FEF]/5 text-[#0A2E6E] shadow-sm shadow-[#1A6FEF]/10'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      } disabled:opacity-50`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        {r === 'customer' ? (
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        ) : (
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        )}
                        {r === 'customer' ? 'Customer' : 'Organiser'}
                      </div>
                      {role === r && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1A6FEF] mx-auto mt-2" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {role === 'organiser' ? 'You can create events and manage ticket sales.' : 'You can browse events and purchase tickets.'}
                </p>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-semibold text-[#0A2E6E] mb-2">Full name</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input
                    ref={nameRef} id="name" type="text" autoComplete="name" required
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (error) setError(''); validateField('name', e.target.value); }}
                    disabled={loading} placeholder="John Smith"
                    data-testid="signup-name-input"
                    className={`${inputBase} ${fieldErrors.name ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200'}`}
                  />
                </div>
                {fieldErrors.name && <p className="mt-1.5 text-sm text-red-500" role="alert">{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label htmlFor="signup-email" className="block text-sm font-semibold text-[#0A2E6E] mb-2">Email address</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <input
                    id="signup-email" type="email" autoComplete="email" inputMode="email" required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); validateField('email', e.target.value); }}
                    disabled={loading} placeholder="you@tcd.ie"
                    data-testid="signup-email-input"
                    className={`${inputBase} ${fieldErrors.email ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200'}`}
                  />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-sm text-red-500" role="alert">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="mb-4">
                <label htmlFor="signup-password" className="block text-sm font-semibold text-[#0A2E6E] mb-2">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input
                    id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(''); validateField('password', e.target.value); }}
                    onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent}
                    disabled={loading} placeholder="At least 8 characters"
                    data-testid="signup-password-input"
                    className={`${inputBase} !pr-12 ${fieldErrors.password ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200'}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} data-testid="signup-toggle-password" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1A6FEF] transition-colors p-1 rounded-lg hover:bg-[#1A6FEF]/5" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-sm text-red-500" role="alert">{fieldErrors.password}</p>}
                {password.length > 0 && !fieldErrors.password && (
                  <div className="mt-2.5">
                    <div className="flex gap-1.5">
                      {[password.length >= 8, password.length >= 12, password.length >= 16 && /[!@#$%^&*]/.test(password)].map((active, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${active ? 'bg-[#59D4C8]' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{password.length < 12 ? 'Weak' : password.length < 16 ? 'Good' : 'Strong'} password</p>
                  </div>
                )}
                {capsLock && (
                  <p className="mt-2 text-sm text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg" role="alert">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    Caps Lock is on
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-[#0A2E6E] mb-2">Confirm password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <input
                    id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); validateField('confirmPassword', e.target.value); }}
                    onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent}
                    disabled={loading} placeholder="Re-enter your password"
                    data-testid="signup-confirm-password-input"
                    className={`${inputBase} !pr-12 ${fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-slate-200'}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} data-testid="signup-toggle-confirm-password" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1A6FEF] transition-colors p-1 rounded-lg hover:bg-[#1A6FEF]/5" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="mt-1.5 text-sm text-red-500" role="alert">{fieldErrors.confirmPassword}</p>}
                {confirmPassword.length > 0 && !fieldErrors.confirmPassword && password === confirmPassword && (
                  <p className="mt-1.5 text-sm text-[#59D4C8] flex items-center gap-1.5 font-medium">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Passwords match
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                data-testid="signup-submit-btn"
                className="w-full bg-[#0A2E6E] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-[#1A6FEF] focus:outline-none focus:ring-2 focus:ring-[#1A6FEF] focus:ring-offset-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#0A2E6E]/20 hover:shadow-xl hover:shadow-[#1A6FEF]/25 hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    {`Create ${role === 'organiser' ? 'organiser ' : ''}account`}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" data-testid="signup-login-link" className="text-[#1A6FEF] font-semibold hover:text-[#0A2E6E] transition-colors">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
