'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { Society } from '@/lib/types';
import { getInitials } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [followedSocieties, setFollowedSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchFollowedSocieties = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/followed-societies`);
        const data = await res.json();
        setFollowedSocieties(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching followed societies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowedSocieties();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold">
            {getInitials(user.name)}
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
            <p className="text-black mb-2">{user.email}</p>
            {user.isOrganiser && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                Event Organiser
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/tickets"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <svg
            className="w-8 h-8 text-blue-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
            />
          </svg>
          <h3 className="font-bold mb-1">My Tickets</h3>
          <p className="text-sm text-black">View your booked tickets</p>
        </Link>

        <Link
          href="/calendar"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
        >
          <svg
            className="w-8 h-8 text-blue-600 mb-3"
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
          <h3 className="font-bold mb-1">Calendar</h3>
          <p className="text-sm text-black">View upcoming events</p>
        </Link>

        {user.isOrganiser && (
          <Link
            href="/organiser/dashboard"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <svg
              className="w-8 h-8 text-blue-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="font-bold mb-1">Dashboard</h3>
            <p className="text-sm text-black">Manage your events</p>
          </Link>
        )}
      </div>

      {/* Followed Societies */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Followed Societies</h2>

        {followedSocieties.length === 0 ? (
          <div className="text-center py-12">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-black mb-4">You're not following any societies yet</p>
            <Link
              href="/search"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Discover Societies
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {followedSocieties.map((society) => (
              <Link
                key={society.id}
                href={`/societies/${society.id}`}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                <div className="relative h-32">
                  <Image
                    src={society.imageUrl}
                    alt={society.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold mb-1">{society.name}</h3>
                  <p className="text-sm text-black line-clamp-2">
                    {society.description}
                  </p>
                  <span className="inline-block mt-2 bg-gray-100 text-black px-2 py-1 rounded text-xs">
                    {society.category}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
