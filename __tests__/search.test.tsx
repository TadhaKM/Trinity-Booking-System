/**
 * search.test.tsx
 * Verifies that the search page renders event cards without the
 * mix-blend-overlay tint that was removed in the new-frontend overhaul.
 */
import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn().mockReturnValue(null) }),
  usePathname: () => '/search',
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className, ...rest }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
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

const mockEvents = [
  {
    id: 'evt-1',
    title: 'Test Event',
    description: 'A test event description',
    category: 'Music',
    startDate: new Date().toISOString(),
    location: 'Trinity College',
    imageUrl: '/test-image.jpg',
    society: { name: 'Test Society' },
    ticketTypes: [{ id: 'tt-1', name: 'General', price: 10, available: 50 }],
  },
];

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockEvents,
  }) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

async function renderSearch() {
  const { default: SearchPage } = await import('@/app/search/page');
  return render(
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}

describe('Search Page', () => {
  it('renders without crashing', async () => {
    const { container } = await renderSearch();
    expect(container).toBeInTheDocument();
  });

  it('displays event cards after loading', async () => {
    await renderSearch();
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });
  });

  it('event card images have NO mix-blend-overlay class', async () => {
    const { container } = await renderSearch();
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });

    // Check all elements for the removed class (use getAttribute to handle SVGAnimatedString)
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const cls = el.getAttribute('class') ?? '';
      expect(cls).not.toMatch(/mix-blend-overlay/);
    });
  });

  it('event cards have NO card-gradient-mint background', async () => {
    const { container } = await renderSearch();
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });
    expect(container.querySelector('[class*="card-gradient-mint"]')).toBeNull();
  });
});
