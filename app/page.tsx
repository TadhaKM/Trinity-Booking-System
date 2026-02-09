'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import BookingModal from '@/components/BookingModal';

const CARD_GRADIENTS = [
  'card-gradient-mint',
  'card-gradient-blue',
  'card-gradient-pink',
  'card-gradient-gold',
  'card-gradient-lavender',
  'card-gradient-peach',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Arts & Culture': '🎨',
  'Music': '🎵',
  'Academic': '📚',
  'Sports & Fitness': '⚽',
  'Debate & Speaking': '🎤',
  'Social': '🎉',
};

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
        <div className="w-12 h-12 rounded-full border-4 border-[#1A6FEF]/20 border-t-[#1A6FEF] animate-spin" />
      </div>
    );
  }

  const getTicketsLeft = (event: Event) => {
    if (!event.ticketTypes) return 0;
    return event.ticketTypes.reduce((sum, tt) => sum + tt.available, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Hero Section */}
      {user ? (
        <div className="relative rounded-3xl overflow-hidden mb-14 shadow-xl">
          <div className="absolute inset-0">
            <img
              src={user.profilePicture || 'https://cdn.britannica.com/30/242230-050-8A280600/Dublin-Ireland-Trinity-College.jpg'}
              alt=""
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A2E6E]/90 via-[#1A6FEF]/70 to-[#59D4C8]/50" />
          </div>
          <div className="relative px-8 py-14 md:px-14 md:py-20 text-white">
            <p className="text-sm font-medium text-[#A8EDEA] mb-3 tracking-wide uppercase">Welcome back</p>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              Hey, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-lg">
              Check out the latest events happening around campus
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/campus-world" className="btn-pill bg-white text-[#1A6FEF]">
                Explore Campus World
              </Link>
              <Link href="/search" className="btn-pill bg-white/15 text-white border border-white/25 backdrop-blur-sm">
                Search Events
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-3xl overflow-hidden mb-14 shadow-xl">
          <div className="absolute inset-0">
            <img
              src="https://cdn.britannica.com/30/242230-050-8A280600/Dublin-Ireland-Trinity-College.jpg"
              alt=""
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A2E6E]/90 via-[#1A6FEF]/70 to-[#59D4C8]/50" />
          </div>
          <div className="relative px-8 py-14 md:px-14 md:py-20 text-white">
            <p className="text-sm font-medium text-[#A8EDEA] mb-3 tracking-wide uppercase">Trinity College Dublin</p>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              Discover Trinity Events
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-lg">
              Book tickets for societies, cultural events, and campus activities
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn-pill bg-white text-[#1A6FEF]">
                Login
              </Link>
              <Link href="/signup" className="btn-pill bg-white/15 text-white border border-white/25 backdrop-blur-sm">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="mb-14">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A2E]">Upcoming Events</h2>
            <p className="text-[#6B7280] mt-1">Don't miss out on what's happening</p>
          </div>
          <Link
            href="/search"
            className="text-[#1A6FEF] hover:text-[#0E4BAF] font-semibold text-sm flex items-center gap-1 transition"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 6).map((event, index) => {
            const ticketsLeft = getTicketsLeft(event);
            const gradientClass = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
            const isLow = ticketsLeft > 0 && ticketsLeft <= 10;

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group cursor-pointer hover-lift"
              >
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-gray-200/60">
                  {/* Image area */}
                  <div className="relative h-52 bg-gray-200">
                    {event.imageUrl && !event.imageUrl.startsWith('data:') ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : event.imageUrl?.startsWith('data:') ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Category pill */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-[#1A1A2E] px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                      {CATEGORY_ICONS[event.category] || '📌'} {event.category}
                    </div>

                    {/* Tickets left badge */}
                    {isLow && (
                      <div className="absolute top-4 right-4 bg-[#FF6B6B] text-white px-3 py-1 rounded-full text-xs font-bold shadow-md badge-pulse">
                        🔥 {ticketsLeft} left
                      </div>
                    )}

                    {/* Title overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-xl font-bold text-white drop-shadow-lg line-clamp-2">
                        {event.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-sm text-[#6B7280] mb-3">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[#1A6FEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.startDate)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[#F5A623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {event.ticketTypes && event.ticketTypes.length > 0 && (
                        <span className="text-lg font-bold text-[#1A6FEF]">
                          {event.ticketTypes[0].price === 0
                            ? 'Free'
                            : formatPrice(Math.min(...event.ticketTypes.map((tt) => tt.price)))}
                        </span>
                      )}
                      <div className="w-10 h-10 rounded-full bg-[#1A6FEF] flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">Browse by Category</h2>
        <p className="text-[#6B7280] mb-6">Find events that match your interests</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Arts & Culture', icon: '🎨', gradient: 'from-[#F5C6D0] to-[#E88EA1]' },
            { name: 'Music', icon: '🎵', gradient: 'from-[#A8EDEA] to-[#59D4C8]' },
            { name: 'Academic', icon: '📚', gradient: 'from-[#89CFF0] to-[#4A90D9]' },
            { name: 'Sports & Fitness', icon: '⚽', gradient: 'from-[#FFD89B] to-[#F5A623]' },
            { name: 'Debate & Speaking', icon: '🎤', gradient: 'from-[#C9B8E8] to-[#9B72CF]' },
            { name: 'Social', icon: '🎉', gradient: 'from-[#FECFEF] to-[#FF9A9E]' },
          ].map((category) => (
            <Link
              key={category.name}
              href={`/search?category=${encodeURIComponent(category.name)}`}
              className="group hover-lift"
            >
              <div className={`bg-gradient-to-br ${category.gradient} rounded-2xl p-5 text-center shadow-md`}>
                <span className="text-3xl block mb-2">{category.icon}</span>
                <p className="font-semibold text-white text-sm drop-shadow-sm">{category.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
