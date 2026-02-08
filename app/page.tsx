'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import BookingModal from '@/components/BookingModal';

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
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
      {user ? (
        <div className="relative rounded-2xl overflow-hidden mb-12 shadow-lg">
          {/* Background: profile picture or Trinity campus fallback */}
          <div className="absolute inset-0">
            <img
              src={user.profilePicture || 'https://cdn.britannica.com/30/242230-050-8A280600/Dublin-Ireland-Trinity-College.jpg'}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d3b66]/85 to-[#1a5a96]/70" />
          </div>
          <div className="relative p-8 md:p-12 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome back, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-xl mb-6 text-blue-100">
              Check out the latest events happening around campus
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/campus-world"
                className="bg-white text-[#0d3b66] px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Explore Campus World
              </Link>
              <Link
                href="/search"
                className="bg-white/20 text-white border border-white/30 px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition"
              >
                Search Events
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden mb-12 shadow-lg">
          <div className="absolute inset-0">
            <img
              src="https://cdn.britannica.com/30/242230-050-8A280600/Dublin-Ireland-Trinity-College.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d3b66]/85 to-[#1a5a96]/70" />
          </div>
          <div className="relative p-8 md:p-12 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Trinity Events
            </h1>
            <p className="text-xl mb-6 text-blue-100">
              Book tickets for societies, cultural events, and campus activities
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="bg-white text-[#0d3b66] px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-white/20 text-white border border-white/30 px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* All Events Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upcoming Events</h2>
          <Link
            href="/search"
            className="text-[#0d3b66] hover:text-[#1a5a96] font-semibold"
          >
            View All
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 6).map((event) => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
            >
              <div className="relative h-48">
                {event.imageUrl.startsWith('data:') ? (
                  <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                )}
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
                      <p className="font-bold text-[#0d3b66]">
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
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {selectedEvent && (
        <BookingModal
          event={selectedEvent}
          isOpen={selectedEvent !== null}
          onClose={() => setSelectedEvent(null)}
        />
      )}

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
              className="bg-white rounded-lg p-6 text-center shadow-md hover:shadow-lg hover:border-[#0d3b66] border border-transparent transition"
            >
              <p className="font-semibold text-[#0d3b66]">{category}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
