'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { Event, TicketType, Coupon } from '@/lib/types';
import { formatDate, formatPrice, calculateFees, applyCoupon } from '@/lib/utils';

interface CheckoutModalProps {
  event: Event;
  ticketSelections: { ticketTypeId: string; quantity: number }[];
  onClose: () => void;
}

function CheckoutModal({ event, ticketSelections, onClose }: CheckoutModalProps) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = ticketSelections.reduce((sum, selection) => {
    const ticketType = event.ticketTypes.find((tt) => tt.id === selection.ticketTypeId);
    return sum + (ticketType ? ticketType.price * selection.quantity : 0);
  }, 0);

  const discountInfo = appliedCoupon
    ? applyCoupon(subtotal, appliedCoupon.discountPercent)
    : { discount: 0, newAmount: subtotal };

  const { bookingFee, total } = calculateFees(discountInfo.newAmount);

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
    } catch (error) {
      setCouponError('Failed to validate coupon');
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventId: event.id,
          ticketSelections,
          couponCode: appliedCoupon?.code,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push('/tickets');
      } else {
        const error = await res.json();
        alert(error.error || 'Booking failed');
      }
    } catch (error) {
      alert('An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold">Checkout</h2>
            <button
              onClick={onClose}
              className="text-black hover:text-black"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">{event.title}</h3>
            <p className="text-sm text-black">{formatDate(event.startDate)}</p>
          </div>

          <div className="space-y-3 mb-6">
            {ticketSelections.map((selection) => {
              const ticketType = event.ticketTypes.find((tt) => tt.id === selection.ticketTypeId);
              if (!ticketType) return null;

              return (
                <div key={selection.ticketTypeId} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{ticketType.name}</p>
                    <p className="text-sm text-black">{selection.quantity}x {formatPrice(ticketType.price)}</p>
                  </div>
                  <p className="font-semibold">{formatPrice(ticketType.price * selection.quantity)}</p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount ({appliedCoupon.discountPercent}%)</span>
                <span>-{formatPrice(discountInfo.discount)}</span>
              </div>
            )}

            <div className="flex justify-between mb-2 text-sm text-black">
              <span>Booking Fee (5%)</span>
              <span>{formatPrice(bookingFee)}</span>
            </div>

            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {!appliedCoupon && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="text-sm text-red-600 mt-1">{couponError}</p>
              )}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Complete Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          setEvent(null);
          return;
        }
        const data = await res.json();
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    setTicketSelections((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, quantity),
    }));
  };

  const handleBookNow = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    const selections = Object.entries(ticketSelections)
      .filter(([_, quantity]) => quantity > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    if (selections.length === 0) {
      alert('Please select at least one ticket');
      return;
    }

    setShowCheckout(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-2">Event not found</h2>
          <Link href="/" className="text-blue-600 hover:text-blue-700">Return to Home</Link>
        </div>
      </div>
    );
  }

  const totalSelected = Object.values(ticketSelections).reduce((sum, qty) => sum + qty, 0);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="relative h-96">
            <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
          </div>
          <div className="p-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                {event.category}
              </span>
              {(event.tags || []).map((tag) => (
                <span key={tag} className="bg-gray-100 text-black px-3 py-1 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl font-bold mb-4">{event.title}</h1>

            {event.society && (
              <Link
                href={`/societies/${event.societyId}`}
                className="text-blue-600 hover:text-blue-700 font-semibold mb-6 inline-block"
              >
                {event.society.name}
              </Link>
            )}

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-black mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-semibold">Date & Time</p>
                  <p className="text-black">{formatDate(event.startDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-black mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-semibold">Location</p>
                  <p className="text-black">{event.location}</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-3">About This Event</h2>
              <p className="text-black text-lg leading-relaxed">{event.description}</p>
            </div>
          </div>
        </div>

        {/* Tickets Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Select Tickets</h2>

          <div className="space-y-4 mb-8">
            {event.ticketTypes.map((ticketType) => (
              <div key={ticketType.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{ticketType.name}</h3>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {ticketType.price === 0 ? 'Free' : formatPrice(ticketType.price)}
                    </p>
                  </div>
                  <span className="text-sm text-black">
                    {ticketType.available} / {ticketType.quantity} available
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        ticketType.id,
                        (ticketSelections[ticketType.id] || 0) - 1
                      )
                    }
                    disabled={!ticketSelections[ticketType.id]}
                    className="w-10 h-10 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">
                    {ticketSelections[ticketType.id] || 0}
                  </span>
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        ticketType.id,
                        (ticketSelections[ticketType.id] || 0) + 1
                      )
                    }
                    disabled={(ticketSelections[ticketType.id] || 0) >= ticketType.available}
                    className="w-10 h-10 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleBookNow}
            disabled={totalSelected === 0}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {totalSelected === 0 ? 'Select Tickets' : `Book ${totalSelected} Ticket${totalSelected !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          event={event}
          ticketSelections={Object.entries(ticketSelections)
            .filter(([_, quantity]) => quantity > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
