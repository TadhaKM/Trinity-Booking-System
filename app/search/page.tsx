'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';
import BookingModal from '@/components/BookingModal';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d3b66]"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);
        if (selectedCategory) params.append('category', selectedCategory);

        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [searchQuery, selectedCategory]);

  const categories = [
    'All',
    'Arts & Culture',
    'Music',
    'Academic',
    'Sports & Fitness',
    'Debate & Speaking',
    'Social',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-4">Search Events</h1>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, societies, or locations..."
            className="w-full px-6 py-4 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                setSelectedCategory(category === 'All' ? '' : category)
              }
              className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 ${
                (category === 'All' && !selectedCategory) ||
                selectedCategory === category
                  ? 'bg-[#0569b9] text-white shadow-md shadow-[#0569b9]/20'
                  : 'bg-[#EFF2F7] text-[#0A2E6E] hover:bg-[#0569b9]/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <svg
            className="w-16 h-16 text-black mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-black mb-2">
            No events found
          </h3>
          <p className="text-black">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div>
          <p className="text-black mb-6">
            {events.length} event{events.length !== 1 ? 's' : ''} found
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group cursor-pointer hover-lift"
              >
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-gray-200/60">
                  <div className="relative h-48 bg-slate-100">
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
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#1A1A2E] px-3 py-1 rounded-full text-xs font-semibold">
                      {event.category}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <h3 className="text-lg font-bold text-white line-clamp-1">{event.title}</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    {event.society && (
                      <p className="text-sm text-[#1A6FEF] font-medium mb-2">{event.society.name}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-[#6B7280] mb-3">
                      <span>{formatDate(event.startDate)}</span>
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {event.ticketTypes && event.ticketTypes.length > 0 && (
                        <span className="text-lg font-bold text-[#1A6FEF]">
                          {event.ticketTypes[0].price === 0
                            ? 'Free'
                            : formatPrice(Math.min(...event.ticketTypes.map((tt) => tt.price)))}
                        </span>
                      )}
                      <div className="w-9 h-9 rounded-full bg-[#1A6FEF] flex items-center justify-center shadow-md shadow-blue-200 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedEvent && (
        <BookingModal
          event={selectedEvent}
          isOpen={selectedEvent !== null}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
