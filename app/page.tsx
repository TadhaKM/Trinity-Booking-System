'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsRes = await fetch('/api/events');
        const eventsData = await eventsRes.json();
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 md:p-12 mb-12 text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Discover Trinity Events
        </h1>
        <p className="text-xl mb-6 text-white">
          Book tickets for societies, cultural events, and campus activities
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/campus-world"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Explore Campus World
          </Link>
          <Link
            href="/search"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition"
          >
            Search Events
          </Link>
        </div>
      </div>

      {/* All Events Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upcoming Events</h2>
          <Link
            href="/search"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            View All
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 6).map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition"
            >
              <div className="relative h-48">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 right-3 bg-white text-black px-3 py-1 rounded-full text-sm font-semibold">
                  {event.category}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-black mb-2 line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-sm text-black mb-3 line-clamp-2">
                  {event.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-black font-medium">
                      {formatDate(event.startDate)}
                    </p>
                    <p className="text-black">{event.location}</p>
                  </div>
                  <div className="text-right">
                    {event.ticketTypes && event.ticketTypes.length > 0 && (
                      <p className="font-bold text-blue-600">
                        {event.ticketTypes[0].price === 0
                          ? 'Free'
                          : `From ${formatPrice(
                              Math.min(
                                ...event.ticketTypes.map((tt) => tt.price)
                              )
                            )}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Categories Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            'Arts & Culture',
            'Music',
            'Academic',
            'Sports & Fitness',
            'Debate & Speaking',
            'Social',
          ].map((category) => (
            <Link
              key={category}
              href={`/search?category=${encodeURIComponent(category)}`}
              className="bg-white rounded-lg p-6 text-center shadow-md hover:shadow-lg transition"
            >
              <p className="font-semibold text-black">{category}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
