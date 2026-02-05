'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice } from '@/lib/utils';

interface DashboardStats {
  totalRevenue: number;
  totalTicketsSold: number;
  upcomingEvents: number;
  totalEvents: number;
}

interface EventStats {
  id: string;
  title: string;
  ticketsSold: number;
  revenue: number;
  capacity: number;
}

export default function OrganiserDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!user.isOrganiser) {
      router.push('/');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/organiser/${user.id}/dashboard`);
        const data = await res.json();
        setStats(data.stats);
        setEventStats(data.events);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-black">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-black">Organiser Dashboard</h1>
          <p className="text-black">Manage your events and track performance</p>
        </div>
        <Link
          href="/organiser/create-event"
          className="bg-[#0d3b66] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0a2f52] transition"
        >
          Create Event
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-black">Total Revenue</h3>
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-black">
            {formatPrice(stats.totalRevenue)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-black">Tickets Sold</h3>
            <svg
              className="w-8 h-8 text-blue-500"
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
          </div>
          <p className="text-3xl font-bold text-black">
            {stats.totalTicketsSold}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-black">
              Upcoming Events
            </h3>
            <svg
              className="w-8 h-8 text-purple-500"
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
          </div>
          <p className="text-3xl font-bold text-black">
            {stats.upcomingEvents}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-black">Total Events</h3>
            <svg
              className="w-8 h-8 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-black">{stats.totalEvents}</p>
        </div>
      </div>

      {/* Events Performance Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-black">Event Performance</h2>
        </div>

        {eventStats.length === 0 ? (
          <div className="p-12 text-center">
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
            <p className="text-black mb-4">No events created yet</p>
            <Link
              href="/organiser/create-event"
              className="inline-block bg-[#0d3b66] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0a2f52] transition"
            >
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Tickets Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Fill Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eventStats.map((event) => {
                  const fillRate = (event.ticketsSold / event.capacity) * 100;
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-[#0d3b66] hover:text-[#1a5a96] font-medium"
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-black">
                        {event.ticketsSold}
                      </td>
                      <td className="px-6 py-4 text-black">
                        {event.capacity}
                      </td>
                      <td className="px-6 py-4 text-black font-semibold">
                        {formatPrice(event.revenue)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                fillRate >= 80
                                  ? 'bg-green-500'
                                  : fillRate >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(fillRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-black w-12">
                            {fillRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
