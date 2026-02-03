'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { useAuthStore } from '@/lib/auth-store';
import { CalendarEvent } from '@/lib/types';
import { formatTime } from '@/lib/utils';

export default function CalendarPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterFollowedOnly, setFilterFollowedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchCalendarEvents = async () => {
      try {
        const params = new URLSearchParams();
        if (filterFollowedOnly) {
          params.append('followedOnly', 'true');
        }

        const res = await fetch(
          `/api/users/${user.id}/calendar-events?${params}`
        );
        const data = await res.json();

        const calendarEvents: CalendarEvent[] = data.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.startDate),
          end: new Date(event.endDate),
          color: getCategoryColor(event.category),
          societyName: event.society?.name || 'Unknown',
          location: event.location,
        }));

        setEvents(calendarEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarEvents();
  }, [user, router, filterFollowedOnly]);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Arts & Culture': 'bg-purple-500',
      'Music': 'bg-pink-500',
      'Academic': 'bg-blue-500',
      'Sports & Fitness': 'bg-green-500',
      'Debate & Speaking': 'bg-orange-500',
      'Social': 'bg-yellow-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.start, date));
  };

  const selectedDateEvents = selectedDate
    ? getEventsForDate(selectedDate)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterFollowedOnly}
            onChange={(e) => setFilterFollowedOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-black">
            Followed societies only
          </span>
        </label>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 hover:bg-gray-100 rounded-lg transition font-medium text-sm"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-black py-2"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-1 border border-gray-100 rounded-lg hover:bg-blue-50 transition ${
                    !isCurrentMonth ? 'text-black' : ''
                  } ${isSelected ? 'bg-blue-100 border-blue-300' : ''} ${
                    isToday ? 'border-2 border-blue-500' : ''
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`${event.color} h-1 rounded-full`}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-black">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Events Sidebar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-lg mb-4">
            {selectedDate
              ? format(selectedDate, 'EEEE, MMMM d')
              : 'Select a date'}
          </h3>

          {selectedDate ? (
            selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block p-3 border-l-4 hover:bg-gray-50 transition rounded"
                    style={{ borderColor: event.color.replace('bg-', '#') }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 ${event.color} rounded-full mt-1.5`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-2">
                          {event.title}
                        </p>
                        <p className="text-xs text-black mt-1">
                          {formatTime(event.start)}
                        </p>
                        <p className="text-xs text-black">{event.location}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          {event.societyName}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-black text-sm">No events on this day</p>
            )
          ) : (
            <p className="text-black text-sm">
              Click on a date to view events
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
