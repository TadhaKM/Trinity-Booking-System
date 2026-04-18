'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { getInitials } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Sync dark state from DOM (set by the FOUC-prevention script in layout.tsx)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    router.push('/login');
  };

  // Hide navbar on auth pages so the full-screen layout fills edge-to-edge
  if (pathname === '/login' || pathname === '/signup') return null;

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/societies', label: 'Societies' },
  ];

  if (user) {
    navItems.push({ href: '/tickets', label: 'My Tickets' });
    navItems.push({ href: '/saved', label: 'Saved' });
    if (user.isOrganiser) navItems.push({ href: '/organiser/dashboard', label: 'Organiser' });
    if (user.isAdmin) navItems.push({ href: '/admin', label: 'Admin' });
  }

  return (
    <>
      <nav
        data-testid="navbar"
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl transition-all duration-300 ${
          scrolled
            ? 'nav-glass rounded-full shadow-lg'
            : 'bg-[#0569b9]/90 backdrop-blur-md rounded-full border border-white/20'
        }`}
      >
        <div className={`px-5 md:px-7 transition-all duration-300 ${scrolled ? 'px-4 md:px-6' : ''}`}>
          <div className={`flex justify-between items-center transition-all duration-300 ${scrolled ? 'h-11 md:h-12' : 'h-14 md:h-16'}`}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0" data-testid="navbar-logo">
              <div className={`rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-300 ${scrolled ? 'w-7 h-7' : 'w-9 h-9'}`}>
                <span className={`text-white font-black transition-all duration-300 ${scrolled ? 'text-xs' : 'text-sm'}`}>T</span>
              </div>
              <div className="flex items-baseline">
                <span className={`font-black text-white tracking-tight transition-all duration-300 ${scrolled ? 'text-base' : 'text-xl'}`}>TCD</span>
                <span className={`font-bold text-white/70 ml-0.5 tracking-tight transition-all duration-300 ${scrolled ? 'text-base' : 'text-xl'}`}>Tickets</span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`rounded-full font-semibold transition-all duration-300 ${
                    scrolled ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
                  } ${
                    pathname === item.href
                      ? 'bg-white text-[#0569b9] shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Notification Bell (logged-in only) */}
              {user && <NotificationBell />}

              {user ? (
                /* ── Profile dropdown ── */
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    data-testid="nav-profile-btn"
                    className="flex items-center gap-2 hover:bg-white/15 rounded-full px-2.5 py-1.5 transition-all duration-300"
                    aria-expanded={profileOpen}
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className={`rounded-full object-cover ring-2 ring-white/30 transition-all duration-300 ${scrolled ? 'w-7 h-7' : 'w-8 h-8'}`}
                      />
                    ) : (
                      <div className={`bg-white/20 border border-white/30 text-white rounded-full flex items-center justify-center font-bold shadow-sm transition-all duration-300 ${scrolled ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-xs'}`}>
                        {getInitials(user.name)}
                      </div>
                    )}
                    <span className={`hidden lg:block font-semibold text-white transition-all duration-300 ${scrolled ? 'text-xs' : 'text-sm'}`}>
                      {user.name.split(' ')[0]}
                    </span>
                    {/* Chevron */}
                    <svg
                      className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown panel */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-black/15 border border-slate-100 overflow-hidden z-50">
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-[#EFF2F7]">
                        <p className="text-sm font-bold text-[#0A2E6E] truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>

                      {/* Menu items */}
                      <div className="py-1.5">
                        <Link
                          href="/profile"
                          data-testid="nav-profile-link"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#EFF2F7] hover:text-[#0569b9] transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Profile
                        </Link>
                        <Link
                          href="/tickets"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#EFF2F7] hover:text-[#0569b9] transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                          My Tickets
                        </Link>
                        <Link
                          href="/saved"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#EFF2F7] hover:text-[#0569b9] transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                          Saved Events
                        </Link>
                        {user.isOrganiser && (
                          <Link
                            href="/organiser/dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#EFF2F7] hover:text-[#0569b9] transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Organiser Dashboard
                          </Link>
                        )}
                        {user.isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#EFF2F7] hover:text-[#0569b9] transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Admin Panel
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-slate-100 py-1.5">
                        <button
                          onClick={handleLogout}
                          data-testid="nav-logout-btn"
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/login"
                    data-testid="nav-login-btn"
                    className={`text-white font-semibold rounded-full hover:bg-white/15 transition-all duration-300 ${scrolled ? 'px-4 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'}`}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    data-testid="nav-signup-btn"
                    className={`bg-white text-[#0569b9] font-semibold rounded-full hover:bg-white/90 transition-all duration-300 shadow-md shadow-black/10 ${scrolled ? 'px-4 py-1.5 text-xs' : 'px-6 py-2.5 text-sm'}`}
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`p-2 rounded-full hover:bg-white/15 transition-all duration-300 ${scrolled ? 'w-7 h-7' : 'w-8 h-8'} flex items-center justify-center`}
              >
                {dark ? (
                  /* Sun icon */
                  <svg className={`text-white transition-all duration-300 ${scrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5" strokeWidth={2} strokeLinecap="round" />
                    <path strokeLinecap="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                ) : (
                  /* Moon icon */
                  <svg className={`text-white transition-all duration-300 ${scrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                )}
              </button>

              {/* Mobile Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                data-testid="nav-mobile-toggle"
                className="md:hidden p-2 rounded-full hover:bg-white/15 transition"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/20 px-5 py-4 bg-[#0569b9]/95 backdrop-blur-xl rounded-b-3xl" data-testid="nav-mobile-menu">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-white text-[#0569b9]'
                      : 'text-white/80 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user ? (
                <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
                  <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/15 hover:text-white transition">
                    Profile
                  </Link>
                  <Link href="/saved" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/15 hover:text-white transition">
                    Saved Events
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-white/10 transition">
                    Log out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/20">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/30 hover:bg-white/15 transition">Login</Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex-1 text-center bg-white text-[#0569b9] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/90 transition">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-24" />
    </>
  );
}
