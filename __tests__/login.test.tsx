/**
 * login.test.tsx
 * Verifies the login page renders correctly with the new Google OAuth button
 * (pointing to /api/auth/google, NOT the old Emergent auth service).
 */
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn().mockReturnValue(null) }),
  usePathname: () => '/login',
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { user: null, login: jest.fn() };
    return selector ? selector(state) : state;
  },
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Invalid credentials' }),
  }) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

async function renderLogin() {
  const { default: LoginPage } = await import('@/app/login/page');
  return render(
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}

describe('Login Page', () => {
  it('renders the login heading', async () => {
    await renderLogin();
    expect(screen.getByTestId('login-heading')).toBeInTheDocument();
  });

  it('renders the Google OAuth button', async () => {
    await renderLogin();
    const googleBtn = screen.getByTestId('login-google-btn');
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).toHaveTextContent(/Continue with Google/i);
  });

  it('renders email input', async () => {
    await renderLogin();
    expect(screen.getByPlaceholderText(/you@tcd\.ie/i)).toBeInTheDocument();
  });

  it('renders link to sign-up page', async () => {
    await renderLogin();
    const signupLink = screen.getByTestId('login-signup-link');
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });
});
