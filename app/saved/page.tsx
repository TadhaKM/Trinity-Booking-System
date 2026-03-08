'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate, formatPrice } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import type { Event } from '@/lib/types';

interface SavedEventItem {
  savedAt: string;
  event: Event & { society?: { id: string; name: string } | null };
}

export default function SavedEventsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<SavedEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetch(`/api/users/${user.id}/saved-events`)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user, router]);

  const unsave = async (eventId: string) => {
    if (!user) return;
    await fetch(`/api/events/${eventId}/save?userId=${user.id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.event.id !== eventId));
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0A2E6E]">Saved Events</h1>
        <p className="text-gray-500 text-sm mt-1">Events you've bookmarked</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0569b9]" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔖"
          title="No saved events"
          description="Browse events and tap the bookmark icon to save them here."
          action={
            <Link href="/search" className="inline-block bg-[#0569b9] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0A2E6E] transition">
              Browse Events
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ event, savedAt }) => {
            const minPrice = event.ticketTypes?.length
              ? Math.min(...event.ticketTypes.map((t) => t.price))
              : null;

            return (
              <div key={event.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                <Link href={`/events/${event.id}`} className="block">
                  <div className="relative h-44 bg-slate-100">
                    {event.imageUrl.startsWith('data:') ? (
                      <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <h3 className="text-sm font-bold text-white line-clamp-1">{event.title}</h3>
                    </div>
                  </div>
                </Link>

                <div className="p-4 flex flex-col flex-1">
                  {event.society && (
                    <p className="text-xs text-[#0569b9] font-semibold mb-1">{event.society.name}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-1">{formatDate(event.startDate)}</p>
                  <p className="text-xs text-gray-400 mb-3">{event.location}</p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-extrabold text-[#0A2E6E] text-sm">
                      {minPrice === null ? '' : minPrice === 0 ? 'Free' : `from ${formatPrice(minPrice)}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="text-xs font-semibold px-3 py-1.5 bg-[#0569b9] text-white rounded-xl hover:bg-[#0A2E6E] transition"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => unsave(event.id)}
                        className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
