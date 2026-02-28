'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import BookingModal from '@/components/BookingModal';

const CATEGORY_ICONS: Record<string, string> = {
  'Arts & Culture': '🎨',
  'Music': '🎵',
  'Academic': '📚',
  'Sports & Fitness': '⚽',
  'Debate & Speaking': '🎤',
  'Social': '🎉',
};

const CATEGORIES = [
  { name: 'Arts & Culture', icon: '🎨', from: '#F5C6D0', to: '#E88EA1' },
  { name: 'Music', icon: '🎵', from: '#A8EDEA', to: '#59D4C8' },
  { name: 'Academic', icon: '📚', from: '#89CFF0', to: '#4A90D9' },
  { name: 'Sports & Fitness', icon: '⚽', from: '#FFD89B', to: '#F5A623' },
  { name: 'Debate & Speaking', icon: '🎤', from: '#C9B8E8', to: '#9B72CF' },
  { name: 'Social', icon: '🎉', from: '#FECFEF', to: '#FF9A9E' },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const eventsReveal = useScrollReveal();
  const categoriesReveal = useScrollReveal();

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
    setTimeout(() => setHeroLoaded(true), 100);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-spinner">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#1A6FEF] animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-[#59D4C8] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  const getTicketsLeft = (event: Event) => {
    if (!event.ticketTypes) return 0;
    return event.ticketTypes.reduce((sum, tt) => sum + tt.available, 0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden" data-testid="hero-section">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10 bg-[#EFF2F7]">
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-br from-[#A8EDEA]/25 to-[#59D4C8]/25 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-[#1A6FEF]/15 to-[#0A2E6E]/15 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-[#F5A623]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center py-12 lg:py-0">
            {/* Left Column - Text */}
            <div className={`space-y-8 transition-all duration-1000 ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              {user ? (
                <>
                  <div>
                    <div className="inline-flex items-center gap-2 bg-[#59D4C8]/15 text-[#0A2E6E] px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-[#59D4C8]/20" data-testid="hero-welcome-badge">
                      <span className="w-2 h-2 bg-[#59D4C8] rounded-full animate-pulse" />
                      Welcome back
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-balance" data-testid="hero-title">
                      <span className="text-[#0A2E6E]">Hey, </span>
                      <span className="text-gradient-brand">{user.name.split(' ')[0]}!</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 mt-6 max-w-lg leading-relaxed" data-testid="hero-subtitle">
                      Check out the latest events happening around campus. Your next great experience is just a click away.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Link
                      href="/campus-world"
                      data-testid="hero-explore-btn"
                      className="btn-pill bg-[#0A2E6E] text-white shadow-lg shadow-[#0A2E6E]/25 hover:shadow-xl hover:shadow-[#0A2E6E]/30 flex items-center gap-2"
                    >
                      Explore Campus World
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </Link>
                    <Link
                      href="/search"
                      data-testid="hero-search-btn"
                      className="btn-pill bg-white text-[#0A2E6E] border-2 border-[#0A2E6E]/10 hover:border-[#1A6FEF]/30 shadow-md"
                    >
                      Search Events
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="inline-flex items-center gap-2 bg-[#59D4C8]/15 text-[#0A2E6E] px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-[#59D4C8]/20" data-testid="hero-badge">
                      <span className="w-2 h-2 bg-[#59D4C8] rounded-full animate-pulse" />
                      Trinity College Dublin
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-balance" data-testid="hero-title">
                      <span className="text-[#0A2E6E]">Discover</span>
                      <br />
                      <span className="text-gradient-brand">Trinity</span>
                      <br />
                      <span className="text-[#0A2E6E]">Events</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 mt-6 max-w-lg leading-relaxed" data-testid="hero-subtitle">
                      Book tickets for societies, cultural events, and campus activities. Your campus life, elevated.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Link
                      href="/login"
                      data-testid="hero-login-btn"
                      className="btn-pill bg-[#0A2E6E] text-white shadow-lg shadow-[#0A2E6E]/25 hover:shadow-xl hover:shadow-[#0A2E6E]/30 flex items-center gap-2"
                    >
                      Get Started
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </Link>
                    <Link
                      href="/signup"
                      data-testid="hero-signup-btn"
                      className="btn-pill bg-white text-[#0A2E6E] border-2 border-[#0A2E6E]/10 hover:border-[#1A6FEF]/30 shadow-md"
                    >
                      Create Account
                    </Link>
                  </div>
                </>
              )}

              {/* Stats row */}
              <div className="flex gap-8 pt-4">
                {[
                  { value: `${events.length}+`, label: 'Events' },
                  { value: '50+', label: 'Societies' },
                  { value: '5K+', label: 'Students' },
                ].map((stat, i) => (
                  <div key={i} className={`transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${600 + i * 150}ms` }} data-testid={`hero-stat-${i}`}>
                    <p className="text-2xl md:text-3xl font-black text-[#0A2E6E]">{stat.value}</p>
                    <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className={`relative hidden lg:block transition-all duration-1000 delay-300 ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              <div className="relative">
                {/* Main image card */}
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-[#0A2E6E]/15 animate-float" style={{ animationDuration: '8s' }}>
                  <img
                    src={user?.profilePicture || 'https://cdn.britannica.com/30/242230-050-8A280600/Dublin-Ireland-Trinity-College.jpg'}
                    alt="Trinity College Dublin"
                    className="w-full h-[480px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A2E6E]/60 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="glass rounded-2xl px-5 py-4">
                      <p className="text-sm font-semibold text-[#0A2E6E]">Next Event</p>
                      <p className="text-lg font-bold text-[#0A2E6E] truncate">
                        {events[0]?.title || 'Browse upcoming events'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating accent cards */}
                <div className="absolute -top-4 -right-4 bg-[#F5A623] text-white px-5 py-3 rounded-2xl shadow-lg shadow-[#F5A623]/30 animate-float-delayed font-bold text-sm">
                  {events.length}+ Events Live
                </div>
                <div className="absolute -bottom-4 -left-4 glass rounded-2xl px-5 py-3 shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#59D4C8] rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-[#0A2E6E]">Booking Open</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ UPCOMING EVENTS ═══════════ */}
      <section
        ref={eventsReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 transition-all duration-1000 ${
          eventsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
        data-testid="events-section"
      >
        {/* Section header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#1A6FEF]/8 text-[#1A6FEF] px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-4">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" /></svg>
              Coming Up
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0A2E6E]" data-testid="events-heading">
              Upcoming Events
            </h2>
            <p className="text-slate-500 mt-2 text-lg">Don&apos;t miss out on what&apos;s happening</p>
          </div>
          <Link
            href="/search"
            data-testid="view-all-events-link"
            className="group flex items-center gap-2 text-[#1A6FEF] hover:text-[#0A2E6E] font-semibold text-sm transition-colors duration-300 bg-[#1A6FEF]/5 hover:bg-[#1A6FEF]/10 px-5 py-2.5 rounded-full"
          >
            View All
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Bento Grid */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6" data-testid="events-grid">
            {events.slice(0, 6).map((event, index) => {
              const ticketsLeft = getTicketsLeft(event);
              const isLow = ticketsLeft > 0 && ticketsLeft <= 10;
              const isFeatured = index === 0;
              const isTall = index === 1;

              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  data-testid={`event-card-${index}`}
                  className={`group cursor-pointer card-shine transition-all duration-500 ${
                    eventsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  } ${
                    isFeatured
                      ? 'lg:col-span-8 lg:row-span-2'
                      : isTall
                      ? 'lg:col-span-4 lg:row-span-2'
                      : 'lg:col-span-4'
                  }`}
                  style={{ transitionDelay: `${200 + index * 100}ms` }}
                >
                  <div className={`relative overflow-hidden rounded-[2rem] bg-white shadow-lg shadow-slate-200/60 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 group-hover:-translate-y-2 ${isFeatured || isTall ? 'h-full' : ''}`}>
                    {/* Image */}
                    <div className={`relative overflow-hidden ${isFeatured ? 'h-full min-h-[400px]' : isTall ? 'h-full min-h-[400px]' : 'h-56'}`}>
                      {event.imageUrl && !event.imageUrl.startsWith('data:') ? (
                        <Image
                          src={event.imageUrl}
                          alt={event.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : event.imageUrl?.startsWith('data:') ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0A2E6E] to-[#1A6FEF]" />
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

                      {/* Category badge */}
                      <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md text-[#0A2E6E] px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm z-10" data-testid={`event-category-${index}`}>
                        {CATEGORY_ICONS[event.category] || '📌'} {event.category}
                      </div>

                      {/* Low tickets badge */}
                      {isLow && (
                        <div className="absolute top-5 right-5 bg-gradient-to-r from-[#FF6B6B] to-[#ee5a5a] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg badge-pulse z-10">
                          Only {ticketsLeft} left
                        </div>
                      )}

                      {/* Content overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-1 group-hover:translate-y-0 transition-transform duration-300 z-10">
                        <h3 className={`font-bold text-white drop-shadow-lg line-clamp-2 mb-3 ${isFeatured ? 'text-2xl md:text-3xl' : 'text-xl'}`} data-testid={`event-title-${index}`}>
                          {event.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(event.startDate)}
                          </div>
                          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate max-w-[150px]">{event.location}</span>
                          </div>
                        </div>

                        {/* Price + Arrow */}
                        <div className="flex items-center justify-between mt-4">
                          {event.ticketTypes && event.ticketTypes.length > 0 && (
                            <span className="text-lg font-bold text-white bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full" data-testid={`event-price-${index}`}>
                              {event.ticketTypes[0].price === 0
                                ? 'Free'
                                : formatPrice(Math.min(...event.ticketTypes.map((tt) => tt.price)))}
                            </span>
                          )}
                          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                            <svg className="w-5 h-5 text-[#0A2E6E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm" data-testid="no-events">
            <div className="w-20 h-20 bg-[#1A6FEF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[#1A6FEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#0A2E6E] mb-2">No events yet</h3>
            <p className="text-slate-500">Check back soon for upcoming events!</p>
          </div>
        )}
      </section>

      {/* ═══════════ CATEGORIES ═══════════ */}
      <section
        ref={categoriesReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 transition-all duration-1000 ${
          categoriesReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
        data-testid="categories-section"
      >
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-[#F5A623]/10 text-[#F5A623] px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-4">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            Categories
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0A2E6E]" data-testid="categories-heading">Browse by Category</h2>
          <p className="text-slate-500 mt-2 text-lg">Find events that match your interests</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5" data-testid="categories-grid">
          {CATEGORIES.map((category, i) => (
            <Link
              key={category.name}
              href={`/search?category=${encodeURIComponent(category.name)}`}
              data-testid={`category-card-${i}`}
              className={`category-card block transition-all duration-500 ${
                categoriesReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${200 + i * 80}ms` }}
            >
              <div
                className="relative rounded-2xl p-6 text-center overflow-hidden group"
                style={{ background: `linear-gradient(145deg, ${category.from} 0%, ${category.to} 100%)` }}
              >
                {/* Shine overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <span className="text-4xl block mb-3 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-12 relative z-10">
                  {category.icon}
                </span>
                <p className="font-bold text-white text-sm drop-shadow-sm relative z-10">{category.name}</p>

                {/* Bottom glow on hover */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA SECTION ═══════════ */}
      {!user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24" data-testid="cta-section">
          <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#0A2E6E] via-[#1A6FEF] to-[#59D4C8] p-12 md:p-16 text-center noise-overlay gradient-bg-animated">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 text-balance">
                Ready to discover your next experience?
              </h2>
              <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
                Join thousands of Trinity students already using TCD Tickets to book events and connect with campus life.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/signup"
                  data-testid="cta-signup-btn"
                  className="btn-pill bg-white text-[#0A2E6E] font-bold shadow-lg hover:shadow-xl"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/search"
                  data-testid="cta-browse-btn"
                  className="btn-pill bg-white/15 text-white border border-white/25 backdrop-blur-sm"
                >
                  Browse Events
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ BOOKING MODAL ═══════════ */}
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
