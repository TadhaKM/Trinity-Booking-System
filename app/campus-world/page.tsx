'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';

export default function CampusWorldPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-black">Campus World</h1>
        <p className="text-black">
          Explore events happening across Trinity Campus
        </p>
      </div>

      <div className="flex-1 flex">
        {/* Map Area */}
        <div className="flex-1 relative">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2381.7144563498384!2d-6.2568!3d53.3438!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48670e9a24e16a0b%3A0x4e61b1c3e89e0a13!2sTrinity%20College%20Dublin!5e0!3m2!1sen!2sie!4v1700000000000!5m2!1sen!2sie"
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Trinity College Dublin Campus Map"
          />

          {/* Event list overlay */}
          {events.length > 0 && (
            <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 max-h-48 overflow-y-auto">
              <h3 className="font-semibold mb-2 text-sm">Events on Campus</h3>
              <div className="space-y-1">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`block w-full text-left px-2 py-1.5 rounded text-sm transition ${
                      selectedEvent?.id === event.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-black'
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
        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
          {selectedEvent ? (
            <div className="p-6">
              <div className="relative h-48 rounded-lg overflow-hidden mb-4">
                <Image
                  src={selectedEvent.imageUrl}
                  alt={selectedEvent.title}
                  fill
                  className="object-cover"
                />
              </div>

              <h2 className="text-2xl font-bold mb-2">{selectedEvent.title}</h2>

              <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedEvent.category}
                </span>
                {selectedEvent.society && (
                  <Link
                    href={`/societies/${selectedEvent.societyId}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {selectedEvent.society.name}
                  </Link>
                )}
              </div>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-black mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-black">
                    {formatDate(selectedEvent.startDate)}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-black mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-black">{selectedEvent.location}</span>
                </div>
              </div>

              <p className="text-black mb-6">{selectedEvent.description}</p>

              {selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Tickets</h3>
                  <div className="space-y-2">
                    {selectedEvent.ticketTypes.map((ticketType) => (
                      <div
                        key={ticketType.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{ticketType.name}</p>
                          <p className="text-sm text-black">
                            {ticketType.available} / {ticketType.quantity} available
                          </p>
                        </div>
                        <p className="font-bold text-blue-600">
                          {ticketType.price === 0
                            ? 'Free'
                            : formatPrice(ticketType.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href={`/events/${selectedEvent.id}`}
                className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                View Event Details
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-6 text-center">
              <div>
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-black">
                  Click on a marker to view event details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
