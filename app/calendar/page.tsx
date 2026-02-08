'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import { Event } from '@/lib/types';
import { formatDate, formatTime, formatPrice, calculateFees, applyCoupon } from '@/lib/utils';

type ModalView = 'details' | 'tickets' | 'auth' | 'guest-form' | 'checkout' | 'confirmation';

interface GuestInfo {
  name: string;
  email: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalView, setModalView] = useState<ModalView>('details');
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '' });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

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

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Arts & Culture': 'bg-purple-500',
      Music: 'bg-pink-500',
      Academic: 'bg-blue-500',
      'Sports & Fitness': 'bg-green-500',
      'Debate & Speaking': 'bg-orange-500',
      Social: 'bg-yellow-500',
    };
    return colors[category] || 'bg-blue-400';
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
    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Open event modal
  const openEventModal = (event: Event) => {
    setSelectedEvent(event);
    setModalView('details');
    setTicketSelections({});
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
    setGuestInfo({ name: '', email: '' });
    setConfirmationData(null);
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setModalView('details');
  };

  // Ticket quantity
  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    setTicketSelections((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, quantity),
    }));
  };

  const totalSelected = Object.values(ticketSelections).reduce((sum, qty) => sum + qty, 0);

  const getSubtotal = () => {
    if (!selectedEvent) return 0;
    return Object.entries(ticketSelections).reduce((sum, [ticketTypeId, qty]) => {
      const tt = selectedEvent.ticketTypes.find((t) => t.id === ticketTypeId);
      return sum + (tt ? tt.price * qty : 0);
    }, 0);
  };

  const subtotal = getSubtotal();
  const discountInfo = appliedCoupon
    ? applyCoupon(subtotal, appliedCoupon.discountPercent)
    : { discount: 0, newAmount: subtotal };
  const { bookingFee, total } = calculateFees(discountInfo.newAmount);

  // Proceed from ticket selection
  const handleProceedToCheckout = () => {
    if (totalSelected === 0) return;
    if (user) {
      setModalView('checkout');
    } else {
      setModalView('auth');
    }
  };

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data);
      } else {
        const error = await res.json();
        setCouponError(error.error || 'Invalid coupon code');
      }
    } catch {
      setCouponError('Failed to validate coupon');
    }
  };

  // Complete booking
  const handleCompleteBooking = async () => {
    if (!selectedEvent) return;
    setBookingLoading(true);

    const selections = Object.entries(ticketSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    try {
      let bookingUserId = user?.id;

      // If guest, create a guest booking via the guest endpoint
      if (!bookingUserId) {
        const guestRes = await fetch('/api/bookings/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: guestInfo.name,
            guestEmail: guestInfo.email,
            eventId: selectedEvent.id,
            ticketSelections: selections,
            couponCode: appliedCoupon?.code,
          }),
        });

        if (guestRes.ok) {
          const data = await guestRes.json();
          setConfirmationData(data);
          setModalView('confirmation');
        } else {
          const error = await guestRes.json();
          alert(error.error || 'Booking failed');
        }
      } else {
        const res = await fetch('/api/bookings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: bookingUserId,
            eventId: selectedEvent.id,
            ticketSelections: selections,
            couponCode: appliedCoupon?.code,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setConfirmationData(data);
          setModalView('confirmation');
        } else {
          const error = await res.json();
          alert(error.error || 'Booking failed');
        }
      }
    } catch {
      alert('An error occurred during checkout');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">Event Calendar</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-black">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-2 hover:bg-blue-50 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 hover:bg-blue-50 rounded-lg transition font-medium text-sm text-black"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-2 hover:bg-blue-50 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-black py-2">
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
                    className={`aspect-square p-1 border rounded-lg hover:bg-blue-50 transition ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    } ${isSelected ? 'bg-blue-100 border-blue-400' : 'border-transparent'} ${
                      isToday ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-black mb-1">{format(day, 'd')}</div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`${getCategoryColor(event.category)} h-1.5 rounded-full`}
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-black font-medium">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
              {Object.entries({
                'Arts & Culture': 'bg-purple-500',
                Music: 'bg-pink-500',
                Academic: 'bg-blue-500',
                'Sports & Fitness': 'bg-green-500',
                'Debate & Speaking': 'bg-orange-500',
                Social: 'bg-yellow-500',
              }).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-xs text-black">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Events Sidebar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-lg text-black mb-4">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </h3>

            {selectedDate ? (
              selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => openEventModal(event)}
                      className="block w-full text-left p-3 border-l-4 border-blue-500 hover:bg-blue-50 transition rounded"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2.5 h-2.5 ${getCategoryColor(event.category)} rounded-full mt-1.5 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-black line-clamp-2">{event.title}</p>
                          <p className="text-xs text-black mt-1">
                            {formatTime(event.startDate)}
                          </p>
                          <p className="text-xs text-black">{event.location}</p>
                          {event.society && (
                            <p className="text-xs text-blue-600 mt-1">{event.society.name}</p>
                          )}
                          {event.ticketTypes && event.ticketTypes.length > 0 && (
                            <p className="text-xs font-semibold text-blue-600 mt-1">
                              {event.ticketTypes[0].price === 0
                                ? 'Free'
                                : `From ${formatPrice(Math.min(...event.ticketTypes.map((tt) => tt.price)))}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-black text-sm">No events on this day</p>
              )
            ) : (
              <p className="text-black text-sm">Click on a date to view events</p>
            )}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold text-black">
                {modalView === 'details' && 'Event Details'}
                {modalView === 'tickets' && 'Select Tickets'}
                {modalView === 'auth' && 'Continue Booking'}
                {modalView === 'guest-form' && 'Guest Details'}
                {modalView === 'checkout' && 'Checkout'}
                {modalView === 'confirmation' && 'Booking Confirmed!'}
              </h2>
              <button onClick={closeModal} className="text-black p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* VIEW: Event Details */}
              {modalView === 'details' && (
                <div>
                  {selectedEvent.imageUrl && (
                    <div className="relative h-48 rounded-lg overflow-hidden mb-4">
                      {selectedEvent.imageUrl.startsWith('data:') ? (
                        <img src={selectedEvent.imageUrl} alt={selectedEvent.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <Image
                          src={selectedEvent.imageUrl}
                          alt={selectedEvent.title}
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className="absolute top-3 right-3 bg-white text-black px-3 py-1 rounded-full text-sm font-semibold">
                        {selectedEvent.category}
                      </div>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-black mb-2">{selectedEvent.title}</h3>

                  {selectedEvent.society && (
                    <p className="text-blue-600 font-semibold mb-4">{selectedEvent.society.name}</p>
                  )}

                  <p className="text-black mb-4">{selectedEvent.description}</p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-black">{formatDate(selectedEvent.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-black">{selectedEvent.location}</span>
                    </div>
                  </div>

                  {selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0 && (
                    <div className="border-t pt-4 mb-4">
                      <h4 className="font-bold text-black mb-2">Tickets</h4>
                      <div className="space-y-2">
                        {selectedEvent.ticketTypes.map((tt) => (
                          <div key={tt.id} className="flex justify-between items-center">
                            <span className="text-black">{tt.name}</span>
                            <div className="text-right">
                              <span className="font-bold text-blue-600">
                                {tt.price === 0 ? 'Free' : formatPrice(tt.price)}
                              </span>
                              <span className="text-xs text-black ml-2">
                                {tt.available} left
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setModalView('tickets')}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                  >
                    Get Tickets
                  </button>
                </div>
              )}

              {/* VIEW: Ticket Selection */}
              {modalView === 'tickets' && (
                <div>
                  <div className="space-y-4 mb-6">
                    {selectedEvent.ticketTypes.map((ticketType) => (
                      <div key={ticketType.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-black">{ticketType.name}</h4>
                            <p className="text-lg font-bold text-blue-600 mt-1">
                              {ticketType.price === 0 ? 'Free' : formatPrice(ticketType.price)}
                            </p>
                          </div>
                          <span className="text-sm text-black">
                            {ticketType.available} available
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              handleQuantityChange(ticketType.id, (ticketSelections[ticketType.id] || 0) - 1)
                            }
                            disabled={!ticketSelections[ticketType.id]}
                            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-semibold text-black">
                            {ticketSelections[ticketType.id] || 0}
                          </span>
                          <button
                            onClick={() =>
                              handleQuantityChange(ticketType.id, (ticketSelections[ticketType.id] || 0) + 1)
                            }
                            disabled={(ticketSelections[ticketType.id] || 0) >= ticketType.available}
                            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalSelected > 0 && (
                    <div className="border-t pt-4 mb-4">
                      <div className="flex justify-between text-black mb-1">
                        <span>Subtotal ({totalSelected} ticket{totalSelected !== 1 ? 's' : ''})</span>
                        <span className="font-semibold">{formatPrice(subtotal)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalView('details')}
                      className="flex-1 border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleProceedToCheckout}
                      disabled={totalSelected === 0}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {totalSelected === 0 ? 'Select Tickets' : 'Proceed'}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW: Auth Choice */}
              {modalView === 'auth' && (
                <div>
                  <p className="text-black mb-6">
                    How would you like to continue with your booking?
                  </p>

                  <div className="space-y-4">
                    <button
                      onClick={() => router.push('/login')}
                      className="w-full border-2 border-blue-600 text-blue-600 py-4 rounded-lg font-bold hover:bg-blue-50 transition"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Log In to Your Account
                      </div>
                      <p className="text-xs font-normal text-black mt-1">
                        View your tickets in your profile
                      </p>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t" />
                      <span className="text-sm text-black">or</span>
                      <div className="flex-1 border-t" />
                    </div>

                    <button
                      onClick={() => setModalView('guest-form')}
                      className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Continue as Guest
                      </div>
                      <p className="text-xs font-normal text-white mt-1">
                        We&apos;ll email your tickets
                      </p>
                    </button>
                  </div>

                  <button
                    onClick={() => setModalView('tickets')}
                    className="w-full mt-4 text-black font-medium hover:text-blue-600 transition text-sm"
                  >
                    Back to ticket selection
                  </button>
                </div>
              )}

              {/* VIEW: Guest Form */}
              {modalView === 'guest-form' && (
                <div>
                  <p className="text-black mb-4">
                    Enter your details and we&apos;ll send your tickets to your email.
                  </p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Full Name</label>
                      <input
                        type="text"
                        value={guestInfo.name}
                        onChange={(e) => setGuestInfo((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="John Smith"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Email Address</label>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="john@tcd.ie"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalView('auth')}
                      className="flex-1 border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setModalView('checkout')}
                      disabled={!guestInfo.name.trim() || !guestInfo.email.trim()}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      Continue to Checkout
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW: Checkout */}
              {modalView === 'checkout' && (
                <div>
                  {/* Booking summary */}
                  <div className="mb-4">
                    <h4 className="font-bold text-black mb-1">{selectedEvent.title}</h4>
                    <p className="text-sm text-black">{formatDate(selectedEvent.startDate)}</p>
                    <p className="text-sm text-black">{selectedEvent.location}</p>
                  </div>

                  {/* Who's booking */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-black">
                      <span className="font-medium">Booking as: </span>
                      {user ? user.name : `${guestInfo.name} (Guest)`}
                    </p>
                    <p className="text-sm text-black">
                      {user ? user.email : guestInfo.email}
                    </p>
                  </div>

                  {/* Ticket breakdown */}
                  <div className="space-y-2 mb-4">
                    {Object.entries(ticketSelections)
                      .filter(([_, qty]) => qty > 0)
                      .map(([ticketTypeId, qty]) => {
                        const tt = selectedEvent.ticketTypes.find((t) => t.id === ticketTypeId);
                        if (!tt) return null;
                        return (
                          <div key={ticketTypeId} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-black">{tt.name}</p>
                              <p className="text-sm text-black">
                                {qty}x {formatPrice(tt.price)}
                              </p>
                            </div>
                            <p className="font-semibold text-black">{formatPrice(tt.price * qty)}</p>
                          </div>
                        );
                      })}
                  </div>

                  {/* Coupon */}
                  {!appliedCoupon && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-black mb-1">Coupon Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter code"
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && <p className="text-sm text-red-600 mt-1">{couponError}</p>}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between mb-1">
                      <span className="text-black">Subtotal</span>
                      <span className="text-black">{formatPrice(subtotal)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between mb-1 text-green-600">
                        <span>Discount ({appliedCoupon.discountPercent}%)</span>
                        <span>-{formatPrice(discountInfo.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-black">Booking Fee (5%)</span>
                      <span className="text-black">{formatPrice(bookingFee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                      <span className="text-black">Total</span>
                      <span className="text-black">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalView(user ? 'tickets' : 'guest-form')}
                      className="flex-1 border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCompleteBooking}
                      disabled={bookingLoading}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-300"
                    >
                      {bookingLoading ? 'Processing...' : 'Complete Booking'}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW: Confirmation */}
              {modalView === 'confirmation' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <h3 className="text-xl font-bold text-black mb-2">Booking Confirmed!</h3>
                  <p className="text-black mb-6">
                    {user
                      ? 'Your tickets have been added to your account.'
                      : `A confirmation has been sent to ${guestInfo.email}.`}
                  </p>

                  <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                    <p className="font-bold text-black">{selectedEvent.title}</p>
                    <p className="text-sm text-black">{formatDate(selectedEvent.startDate)}</p>
                    <p className="text-sm text-black">{selectedEvent.location}</p>
                    <p className="text-sm font-semibold text-blue-600 mt-2">
                      {totalSelected} ticket{totalSelected !== 1 ? 's' : ''} - {formatPrice(total)}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                    >
                      Back to Calendar
                    </button>
                    {user && (
                      <button
                        onClick={() => router.push('/tickets')}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                      >
                        View My Tickets
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
