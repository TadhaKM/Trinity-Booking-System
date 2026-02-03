'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { Society, Event } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';

export default function SocietyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const societyId = params.societyId as string;

  const [society, setSociety] = useState<Society | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch society details
        const societyRes = await fetch(`/api/societies/${societyId}`);
        const societyData = await societyRes.json();
        setSociety(societyData);

        // Fetch society events
        const eventsRes = await fetch(`/api/societies/${societyId}/events`);
        const eventsData = await eventsRes.json();
        setEvents(Array.isArray(eventsData) ? eventsData : []);

        // Check if user is following
        if (user) {
          const followingRes = await fetch(
            `/api/societies/${societyId}/following?userId=${user.id}`
          );
          const followingData = await followingRes.json();
          setIsFollowing(followingData.isFollowing);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [societyId, user]);

  const handleFollow = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`/api/societies/${societyId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (res.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (error) {
      console.error('Error following society:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!society) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-2">
            Society not found
          </h2>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Society Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="relative h-64">
          <Image
            src={society.imageUrl}
            alt={society.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{society.name}</h1>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                {society.category}
              </span>
            </div>
            <button
              onClick={handleFollow}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                isFollowing
                  ? 'bg-gray-200 text-black hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
          <p className="text-black text-lg">{society.description}</p>
        </div>
      </div>

      {/* Events Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-black">No upcoming events</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
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
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold mb-2 line-clamp-1">
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
        )}
      </div>
    </div>
  );
}
