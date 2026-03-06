/**
 * societies.test.tsx
 * Verifies that the societies page has no ticker and no search bar
 * (features removed in the new-frontend overhaul).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SocietiesPage from '@/app/societies/page';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (s: any) => any) => selector({ user: null }),
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  }) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('Societies Page', () => {
  it('renders the page title', async () => {
    render(<SocietiesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('societies-title')).toBeInTheDocument();
    });
    expect(screen.getByTestId('societies-title').textContent).toBe('TCD Societies');
  });

  it('has NO ticker element (animate-ticker removed)', async () => {
    const { container } = render(<SocietiesPage />);
    await waitFor(() => screen.getByTestId('societies-title'));
    expect(container.querySelector('[class*="animate-ticker"]')).toBeNull();
  });

  it('has NO search input (search bar removed)', async () => {
    render(<SocietiesPage />);
    await waitFor(() => screen.getByTestId('societies-title'));
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
  });

  it('renders the category filter pills', async () => {
    render(<SocietiesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('categories-filter')).toBeInTheDocument();
    });
    expect(screen.getByTestId('category-pill-all')).toBeInTheDocument();
  });
});
