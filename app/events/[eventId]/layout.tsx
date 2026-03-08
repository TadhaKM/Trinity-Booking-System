/**
 * Server-component layout for event detail pages.
 * Exports generateMetadata so every /events/[eventId] URL gets
 * proper Open Graph / Twitter Card / canonical SEO tags.
 */

import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

interface Props {
  params: Promise<{ eventId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { society: { select: { name: true } } },
  });

  if (!event) {
    return {
      title: 'Event Not Found | TCD Tickets',
      description: 'This event could not be found.',
    };
  }

  const startFormatted = new Date(event.startDate).toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const description = [
    event.description.slice(0, 160),
    `— ${startFormatted}`,
    event.location ? `at ${event.location}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tcd-tickets.vercel.app';
  const canonicalUrl = `${siteUrl}/events/${eventId}`;
  const ogImage = event.imageUrl?.startsWith('data:')
    ? `${siteUrl}/og-default.png`
    : event.imageUrl;

  return {
    title: `${event.title} | TCD Tickets`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: event.title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
      siteName: 'TCD Tickets',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      images: [ogImage],
    },
    other: {
      'event:start_time': event.startDate.toISOString(),
      'event:location': event.location,
    },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
