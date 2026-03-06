'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';
import BookingModal from '@/components/BookingModal';

const TCD_CENTER: [number, number] = [-6.2546, 53.3438]; // Mapbox uses [lng, lat]
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const HAS_TOKEN = MAPBOX_TOKEN.length > 0 && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN';

export default function CampusWorldPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('mapbox-gl').Map | null>(null);
  const markersRef = useRef<import('mapbox-gl').Marker[]>([]);

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch events
  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Initialise Mapbox map once events are loaded
  useEffect(() => {
    if (loading || !mapRef.current) return;
    if (mapInstanceRef.current) return;
    if (!HAS_TOKEN) return;

    let map: import('mapbox-gl').Map;

    import('mapbox-gl').then((mapboxgl) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      mapboxgl.default.accessToken = MAPBOX_TOKEN;

      map = new mapboxgl.default.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: TCD_CENTER,
        zoom: 16.5,
      });

      mapInstanceRef.current = map;

      // Remove old markers on re-render
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Add a custom marker for each event with locationCoords
      events.forEach((event) => {
        if (!event.locationCoords) return;
        let coords: { lat: number; lng: number } | null = null;
        try {
          coords = typeof event.locationCoords === 'string'
            ? JSON.parse(event.locationCoords)
            : event.locationCoords;
        } catch {
          return;
        }
        if (!coords) return;

        // Location pin marker element (SVG teardrop shape)
        const el = document.createElement('div');
        el.style.cssText = 'cursor: pointer; transition: transform 0.15s ease; transform-origin: bottom center;';
        el.innerHTML = `
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.4 23.467 15.04 24.053a1.333 1.333 0 001.92 0C17.6 39.467 32 26.627 32 16 32 7.163 24.837 0 16 0z" fill="#0569b9"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
        `;
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

        // Rich popup card with location icon + event info
        const formattedDate = new Date(event.startDate).toLocaleDateString('en-IE', {
          weekday: 'short', day: 'numeric', month: 'short',
        });
        const popup = new mapboxgl.default.Popup({
          offset: [0, -44],
          closeButton: true,
          closeOnClick: false,
          maxWidth: '260px',
          className: 'campus-popup',
        }).setHTML(`
          <div style="font-family:system-ui;padding:4px 0 2px">
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
              <div style="flex-shrink:0;width:32px;height:32px;background:#EFF2F7;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-top:2px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0569b9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div style="min-width:0">
                <p style="margin:0;font-weight:800;font-size:13px;color:#0A2E6E;line-height:1.3;white-space:normal">${event.title}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#64748b;white-space:normal">${event.location}</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#EFF2F7;border-radius:8px;margin-bottom:8px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0569b9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style="font-size:11px;font-weight:600;color:#0A2E6E">${formattedDate}</span>
            </div>
            ${event.ticketTypes && event.ticketTypes.length > 0
              ? `<div style="display:flex;align-items:center;justify-content:space-between">
                   <span style="font-size:11px;color:#64748b">${event.ticketTypes[0].available} tickets left</span>
                   <span style="font-size:12px;font-weight:800;color:#0569b9">${event.ticketTypes[0].price === 0 ? 'Free' : '€' + (event.ticketTypes[0].price / 100).toFixed(2)}</span>
                 </div>`
              : ''}
          </div>
        `);

        const marker = new mapboxgl.default.Marker({ element: el })
          .setLngLat([coords.lng, coords.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', () => {
          setSelectedEvent(event);
          map.flyTo({ center: [coords!.lng, coords!.lat], zoom: 17.5, speed: 1.2 });
        });

        markersRef.current.push(marker);
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Fly to selected event when changed from sidebar
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedEvent?.locationCoords) return;
    try {
      const coords = typeof selectedEvent.locationCoords === 'string'
        ? JSON.parse(selectedEvent.locationCoords)
        : selectedEvent.locationCoords;
      mapInstanceRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 17.5, speed: 1.2 });
    } catch { /* invalid coords */ }
  }, [selectedEvent]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-[#EFF2F7]">
      {/* Mapbox GL CSS */}
      <link
        rel="stylesheet"
        href="https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css"
        crossOrigin=""
      />
      {/* Campus popup overrides */}
      <style>{`
        .campus-popup .mapboxgl-popup-content {
          border-radius: 14px;
          padding: 14px 16px 12px;
          box-shadow: 0 8px 32px rgba(10,46,110,0.18), 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid rgba(5,105,185,0.1);
          min-width: 220px;
        }
        .campus-popup .mapboxgl-popup-tip {
          border-top-color: white !important;
        }
        .campus-popup .mapboxgl-popup-close-button {
          font-size: 16px;
          color: #94a3b8;
          top: 8px;
          right: 10px;
          line-height: 1;
        }
        .campus-popup .mapboxgl-popup-close-button:hover {
          color: #0A2E6E;
          background: none;
        }
      `}</style>

      {/* Header */}
      <div className="bg-[#0A2E6E] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Campus World</h1>
          <p className="text-white/50 text-sm">
            {loading ? 'Loading events…' : `${events.length} events across Trinity Campus`}
          </p>
        </div>
        {!HAS_TOKEN ? (
          <div className="hidden md:flex items-center gap-2 bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Add NEXT_PUBLIC_MAPBOX_TOKEN to .env
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 bg-white/10 border border-white/20 text-white/70 text-xs font-semibold px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Mapbox
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#EFF2F7]">
              <div className="w-12 h-12 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#0569b9] animate-spin" />
            </div>
          ) : HAS_TOKEN ? (
            <div ref={mapRef} className="w-full h-full" />
          ) : (
            /* Fallback iframe when no token */
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#EFF2F7] gap-4 p-8">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-[#0A2E6E] text-lg mb-1">Mapbox token missing</p>
                <p className="text-slate-500 text-sm max-w-xs">
                  Add your free token to <code className="bg-slate-100 px-1 rounded">.env</code>:
                </p>
                <code className="mt-2 block bg-slate-800 text-green-400 text-xs px-4 py-2 rounded-xl font-mono">
                  NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
                </code>
                <a
                  href="https://account.mapbox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[#0569b9] text-sm font-semibold hover:underline"
                >
                  Get a free token at mapbox.com →
                </a>
              </div>
            </div>
          )}

          {/* Floating event list overlay (no-token fallback) */}
          {!HAS_TOKEN && events.length > 0 && (
            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 p-4 max-h-56 overflow-y-auto w-64">
              <h3 className="font-bold text-[#0A2E6E] text-sm mb-2">Events on Campus</h3>
              <div className="space-y-1">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedEvent?.id === event.id
                        ? 'bg-[#0569b9]/10 text-[#0569b9]'
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Event Details Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200/70 overflow-y-auto flex-shrink-0 shadow-xl">
          {selectedEvent ? (
            <div className="p-6">
              <div className="relative h-48 rounded-2xl overflow-hidden mb-5 bg-slate-100">
                <Image
                  src={selectedEvent.imageUrl}
                  alt={selectedEvent.title}
                  fill
                  className="object-cover"
                  sizes="384px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A2E6E]/40 to-transparent" />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#0A2E6E] text-xs font-bold px-2.5 py-1 rounded-full">
                  {selectedEvent.category}
                </span>
              </div>

              <h2 className="text-xl font-black text-[#0A2E6E] tracking-tight mb-1">
                {selectedEvent.title}
              </h2>

              {selectedEvent.society && (
                <Link
                  href={`/societies/${selectedEvent.societyId}`}
                  className="text-[#0569b9] text-sm font-semibold hover:text-[#0A2E6E] transition-colors"
                >
                  {selectedEvent.society.name}
                </Link>
              )}

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 bg-[#0569b9]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#0569b9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">{formatDate(selectedEvent.startDate)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 bg-[#0569b9]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#0569b9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="font-medium">{selectedEvent.location}</span>
                </div>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mt-4 line-clamp-3">
                {selectedEvent.description}
              </p>

              {selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-bold text-[#0A2E6E] text-sm mb-3">Tickets</h3>
                  <div className="space-y-2">
                    {selectedEvent.ticketTypes.map((tt) => (
                      <div key={tt.id} className="flex justify-between items-center p-3 bg-[#EFF2F7] rounded-xl">
                        <div>
                          <p className="font-semibold text-[#0A2E6E] text-sm">{tt.name}</p>
                          <p className="text-xs text-slate-500">{tt.available} left</p>
                        </div>
                        <p className="font-black text-[#0569b9]">
                          {tt.price === 0 ? 'Free' : formatPrice(tt.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setBookingEvent(selectedEvent)}
                className="mt-6 w-full bg-[#0569b9] text-white py-3.5 rounded-xl font-bold hover:bg-[#0A2E6E] transition-all duration-300 shadow-lg shadow-[#0569b9]/20 hover:shadow-xl hover:-translate-y-0.5"
              >
                Book Tickets
              </button>

              <button
                onClick={() => setSelectedEvent(null)}
                className="mt-2 w-full text-slate-400 hover:text-slate-600 py-2 text-sm font-medium transition-colors"
              >
                ← Back to list
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 bg-[#0569b9]/8 rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-10 h-10 text-[#0569b9]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-bold text-[#0A2E6E] text-lg mb-1">Click an event</p>
              <p className="text-slate-400 text-sm">
                {HAS_TOKEN
                  ? 'Click any pin on the map to see event details'
                  : 'Select an event from the list to see details'}
              </p>

              {events.length > 0 && (
                <div className="mt-6 w-full space-y-2 max-h-64 overflow-y-auto">
                  {events.slice(0, 8).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left px-4 py-3 bg-[#EFF2F7] hover:bg-[#0569b9]/8 rounded-xl text-sm font-semibold text-[#0A2E6E] transition-colors duration-200"
                    >
                      {event.title}
                    </button>
                  ))}
                  {events.length > 8 && (
                    <p className="text-xs text-slate-400 pt-1">+{events.length - 8} more on the map</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {bookingEvent && (
        <BookingModal
          event={bookingEvent}
          isOpen={bookingEvent !== null}
          onClose={() => setBookingEvent(null)}
          closeLabel="Back to Map"
        />
      )}
    </div>
  );
}
