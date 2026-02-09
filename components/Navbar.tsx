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
    <nav className="sticky top-0 z-50 bg-[#0E73B9] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#1A6FEF] flex items-center justify-center">
                <span className="text-white font-extrabold text-sm">T</span>
              </div>
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-white">TCD</span>
                <span className="text-xl font-bold text-white/80 ml-1">Tickets</span>
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
                    ? 'bg-white text-[#0E73B9] shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
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
                  className="flex items-center gap-2 hover:bg-white/10 rounded-full px-3 py-1.5 transition"
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
                  <span className="hidden md:block text-sm font-medium text-white">
                    {user.name.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white/80 hover:text-white text-sm font-medium px-3 py-2 rounded-full hover:bg-white/10 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/10 transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-white text-[#0E73B9] text-sm font-semibold px-5 py-2 rounded-full hover:bg-white/90 transition shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-white/20 px-4 py-3 bg-[#0E73B9]">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-white text-[#0E73B9]'
                  : 'text-white/80 hover:bg-white/10'
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
