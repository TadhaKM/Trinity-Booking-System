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

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Focus name input on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleKeyEvent = (e: React.KeyboardEvent) => {
    if (e.getModifierState) {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  const validateField = (field: string, value: string) => {
    const errors: Record<string, string> = { ...fieldErrors };

    switch (field) {
      case 'name':
        if (value.trim().length > 0 && value.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters.';
        } else if (value.trim().length > 100) {
          errors.name = 'Name must be less than 100 characters.';
        } else {
          delete errors.name;
        }
        break;
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value.trim().length > 0 && !emailRegex.test(value.trim())) {
          errors.email = 'Please enter a valid email address.';
        } else {
          delete errors.email;
        }
        break;
      }
      case 'password':
        if (value.length > 0 && value.length < 8) {
          errors.password = 'Password must be at least 8 characters.';
        } else if (value.length > 128) {
          errors.password = 'Password must be less than 128 characters.';
        } else {
          delete errors.password;
        }
        if (confirmPassword && value !== confirmPassword) {
          errors.confirmPassword = 'Passwords do not match.';
        } else if (confirmPassword) {
          delete errors.confirmPassword;
        }
        break;
      case 'confirmPassword':
        if (value.length > 0 && value !== password) {
          errors.confirmPassword = 'Passwords do not match.';
        } else {
          delete errors.confirmPassword;
        }
        break;
    }

    setFieldErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Full validation
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

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setFieldErrors({ email: data.error });
        } else {
          setError(data.details || data.error || 'Something went wrong. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Auto-login after signup
      login(data, false);
      router.push('/');
    } catch {
      setError('Unable to connect. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d3b66]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">
              <span className="text-[#0d3b66]">TCD</span>
              <span className="text-[#3a7bc8] ml-1">Tickets</span>
            </h1>
          </Link>
          <p className="text-black mt-2">Create your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  disabled={loading}
                  className={`py-3 px-4 rounded-lg border-2 font-medium transition text-sm ${
                    role === 'customer'
                      ? 'border-[#0d3b66] bg-[#0d3b66] text-white'
                      : 'border-gray-200 text-black hover:border-[#0d3b66]/50'
                  } disabled:opacity-50`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Customer
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('organiser')}
                  disabled={loading}
                  className={`py-3 px-4 rounded-lg border-2 font-medium transition text-sm ${
                    role === 'organiser'
                      ? 'border-[#0d3b66] bg-[#0d3b66] text-white'
                      : 'border-gray-200 text-black hover:border-[#0d3b66]/50'
                  } disabled:opacity-50`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Organiser
                  </div>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {role === 'organiser'
                  ? 'You can create events and manage ticket sales.'
                  : 'You can browse events and purchase tickets.'}
              </p>
            </div>

            {/* Name Field */}
            <div className="mb-5">
              <label htmlFor="name" className="block text-sm font-medium text-black mb-1.5">
                Full name
              </label>
              <input
                ref={nameRef}
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                  validateField('name', e.target.value);
                }}
                disabled={loading}
                placeholder="John Smith"
                className={`w-full px-4 py-3 border rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d3b66] focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  fieldErrors.name ? 'border-red-400' : 'border-gray-300'
                }`}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              />
              {fieldErrors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="mb-5">
              <label htmlFor="signup-email" className="block text-sm font-medium text-black mb-1.5">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                  validateField('email', e.target.value);
                }}
                disabled={loading}
                placeholder="you@tcd.ie"
                className={`w-full px-4 py-3 border rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d3b66] focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  fieldErrors.email ? 'border-red-400' : 'border-gray-300'
                }`}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-5">
              <label htmlFor="signup-password" className="block text-sm font-medium text-black mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                    validateField('password', e.target.value);
                  }}
                  onKeyDown={handleKeyEvent}
                  onKeyUp={handleKeyEvent}
                  disabled={loading}
                  placeholder="At least 8 characters"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d3b66] focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    fieldErrors.password ? 'border-red-400' : 'border-gray-300'
                  }`}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-[#0d3b66] p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.password}
                </p>
              )}

              {/* Password strength indicator */}
              {password.length > 0 && !fieldErrors.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 8 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 12 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${password.length >= 16 && /[!@#$%^&*]/.test(password) ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {password.length < 12 ? 'Weak' : password.length < 16 ? 'Good' : 'Strong'} password
                  </p>
                </div>
              )}

              {/* Caps Lock Warning */}
              {capsLock && (
                <p className="mt-1.5 text-sm text-amber-600 flex items-center gap-1" role="alert">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Caps Lock is on
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="mb-6">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-black mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                    validateField('confirmPassword', e.target.value);
                  }}
                  onKeyDown={handleKeyEvent}
                  onKeyUp={handleKeyEvent}
                  disabled={loading}
                  placeholder="Re-enter your password"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d3b66] focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    fieldErrors.confirmPassword ? 'border-red-400' : 'border-gray-300'
                  }`}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-[#0d3b66] p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              )}

              {/* Match indicator */}
              {confirmPassword.length > 0 && !fieldErrors.confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Passwords match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0d3b66] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#0a2f52] focus:outline-none focus:ring-2 focus:ring-[#0d3b66] focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                `Create ${role === 'organiser' ? 'organiser' : ''} account`
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 text-center">
            <p className="text-sm text-black">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-[#0d3b66] font-semibold hover:underline focus:outline-none focus:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
