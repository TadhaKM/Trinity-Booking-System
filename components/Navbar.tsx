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
    <nav className="bg-[#0E73B9] border-b border-[#0a5d94] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-white">TCD</span>
              <span className="text-2xl font-bold text-blue-200 ml-1">
                Tickets
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  pathname === item.href
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-3 py-2 transition"
                >
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/30"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <span className="hidden md:block font-medium text-white">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white/80 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-white text-[#0E73B9] px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-[#0a5d94] px-4 py-3 bg-[#0966a6]">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
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
