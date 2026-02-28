'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { getInitials } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/campus-world', label: 'Campus World' },
    { href: '/search', label: 'Search' },
    { href: '/calendar', label: 'Calendar' },
  ];

  if (user) {
    navItems.push({ href: '/tickets', label: 'My Tickets' });
    if (user.isOrganiser) {
      navItems.push({ href: '/organiser/dashboard', label: 'Organiser' });
    }
    if (user.isAdmin) {
      navItems.push({ href: '/admin', label: 'Admin' });
    }
  }

  return (
    <>
      <nav
        data-testid="navbar"
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl transition-all duration-500 ${
          scrolled
            ? 'nav-glass rounded-full shadow-lg'
            : 'bg-white/60 backdrop-blur-md rounded-full border border-white/30'
        }`}
      >
        <div className="px-5 md:px-7">
          <div className="flex justify-between items-center h-14 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group" data-testid="navbar-logo">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A6FEF] to-[#0A2E6E] flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                <span className="text-white font-black text-sm">T</span>
              </div>
              <div className="flex items-baseline">
                <span className="text-xl font-black text-[#0A2E6E] tracking-tight">TCD</span>
                <span className="text-xl font-bold text-[#1A6FEF]/70 ml-0.5 tracking-tight">Tickets</span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    pathname === item.href
                      ? 'bg-[#0A2E6E] text-white shadow-md shadow-[#0A2E6E]/20'
                      : 'text-slate-600 hover:text-[#1A6FEF] hover:bg-[#1A6FEF]/8'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/profile"
                    data-testid="nav-profile-link"
                    className="flex items-center gap-2 hover:bg-[#1A6FEF]/8 rounded-full px-3 py-1.5 transition-all duration-300"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-[#1A6FEF]/20"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-[#1A6FEF] to-[#0A2E6E] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <span className="hidden lg:block text-sm font-semibold text-[#0A2E6E]">
                      {user.name.split(' ')[0]}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    data-testid="nav-logout-btn"
                    className="text-slate-500 hover:text-[#0A2E6E] text-sm font-semibold px-3 py-2 rounded-full hover:bg-slate-100 transition-all duration-300"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/login"
                    data-testid="nav-login-btn"
                    className="text-[#0A2E6E] text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#0A2E6E]/5 transition-all duration-300"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    data-testid="nav-signup-btn"
                    className="bg-[#0A2E6E] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#1A6FEF] transition-all duration-300 shadow-md shadow-[#0A2E6E]/20 hover:shadow-lg hover:shadow-[#1A6FEF]/25"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                data-testid="nav-mobile-toggle"
                className="md:hidden p-2 rounded-full hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5 text-[#0A2E6E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="md:hidden border-t border-slate-200/50 px-5 py-4 bg-white/90 backdrop-blur-xl rounded-b-3xl" data-testid="nav-mobile-menu">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-[#0A2E6E] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {!user && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200/50">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-[#0A2E6E] text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#0A2E6E]/20 hover:bg-[#0A2E6E]/5 transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center bg-[#0A2E6E] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1A6FEF] transition"
                  >
                    Sign Up
                  </Link>
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
