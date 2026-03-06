/**
 * navbar.test.tsx
 * Verifies the Navbar renders correctly for a guest (unauthenticated) user.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from '@/components/Navbar';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { user: null, logout: jest.fn() };
    return selector ? selector(state) : state;
  },
}));

describe('Navbar — guest user', () => {
  it('renders the TCD Tickets logo', () => {
    render(<Navbar />);
    expect(screen.getByTestId('navbar-logo')).toBeInTheDocument();
    expect(screen.getByText('TCD')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
  });

  it('renders core desktop nav links', () => {
    render(<Navbar />);
    expect(screen.getByTestId('nav-link-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-search')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-societies')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-campus-world')).toBeInTheDocument();
  });

  it('shows Login and Sign Up buttons for guest users', () => {
    render(<Navbar />);
    expect(screen.getByTestId('nav-login-btn')).toBeInTheDocument();
    expect(screen.getByTestId('nav-signup-btn')).toBeInTheDocument();
  });

  it('does NOT show profile or logout controls for guest users', () => {
    render(<Navbar />);
    expect(screen.queryByTestId('nav-profile-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-logout-btn')).not.toBeInTheDocument();
  });
});
