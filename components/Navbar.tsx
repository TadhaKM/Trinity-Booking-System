'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { getInitials } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

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
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#1A6FEF] flex items-center justify-center">
                <span className="text-white font-extrabold text-sm">T</span>
              </div>
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-[#1A1A2E]">TCD</span>
                <span className="text-xl font-bold text-[#1A6FEF] ml-1">Tickets</span>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-[#1A6FEF] text-white shadow-md shadow-blue-200'
                    : 'text-[#6B7280] hover:text-[#1A1A2E] hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-full px-3 py-1.5 transition"
                >
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-[#1A6FEF]/20"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-[#1A6FEF] to-[#0E4BAF] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium text-[#1A1A2E]">
                    {user.name.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[#6B7280] hover:text-[#1A1A2E] text-sm font-medium px-3 py-2 rounded-full hover:bg-gray-100 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-[#1A6FEF] text-sm font-semibold px-4 py-2 rounded-full hover:bg-blue-50 transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#1A6FEF] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#0E4BAF] transition shadow-md shadow-blue-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-gray-100 px-4 py-3 bg-white/90 backdrop-blur-lg">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-[#1A6FEF] text-white'
                  : 'text-[#6B7280] hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
