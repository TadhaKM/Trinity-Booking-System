'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { Event } from '@/lib/types';
import { formatDate, formatPrice, calculateFees, applyCoupon } from '@/lib/utils';

type ModalView = 'details' | 'tickets' | 'auth' | 'guest-form' | 'checkout' | 'confirmation';

interface GuestInfo {
  name: string;
  email: string;
}

interface BookingModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  closeLabel?: string;
}

export default function BookingModal({ event, isOpen, onClose, closeLabel }: BookingModalProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [modalView, setModalView] = useState<ModalView>('details');
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '' });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

  // Reset state when modal opens or event changes
  useEffect(() => {
    if (isOpen) {
      setModalView('details');
      setTicketSelections({});
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
      setGuestInfo({ name: '', email: '' });
      setConfirmationData(null);
    }
  }, [isOpen, event.id]);

  // Ticket quantity
  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    setTicketSelections((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, quantity),
    }));
  };

  const totalSelected = Object.values(ticketSelections).reduce((sum, qty) => sum + qty, 0);

  const getSubtotal = () => {
    return Object.entries(ticketSelections).reduce((sum, [ticketTypeId, qty]) => {
      const tt = event.ticketTypes.find((t) => t.id === ticketTypeId);
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
    setBookingLoading(true);

    const selections = Object.entries(ticketSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    try {
      let bookingUserId = user?.id;

      if (!bookingUserId) {
        const guestRes = await fetch('/api/bookings/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: guestInfo.name,
            guestEmail: guestInfo.email,
            eventId: event.id,
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
            eventId: event.id,
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

  if (!isOpen) return null;

  return (
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
          <button onClick={onClose} className="text-black p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* VIEW: Event Details */}
          {modalView === 'details' && (
            <div>
              {event.imageUrl && (
                <div className="relative h-48 rounded-lg overflow-hidden mb-4">
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white text-black px-3 py-1 rounded-full text-sm font-semibold">
                    {event.category}
                  </div>
                </div>
              )}

              <h3 className="text-2xl font-bold text-black mb-2">{event.title}</h3>

              {event.society && (
                <p className="text-[#0d3b66] font-semibold mb-4">{event.society.name}</p>
              )}

              <p className="text-black mb-4">{event.description}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-black">{formatDate(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-black">{event.location}</span>
                </div>
              </div>

              {event.ticketTypes && event.ticketTypes.length > 0 && (
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-bold text-black mb-2">Tickets</h4>
                  <div className="space-y-2">
                    {event.ticketTypes.map((tt) => (
                      <div key={tt.id} className="flex justify-between items-center">
                        <span className="text-black">{tt.name}</span>
                        <div className="text-right">
                          <span className="font-bold text-[#0d3b66]">
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
                className="w-full bg-[#0d3b66] text-white py-3 rounded-lg font-bold hover:bg-[#0a2f52] transition"
              >
                Get Tickets
              </button>
            </div>
          )}

          {/* VIEW: Ticket Selection */}
          {modalView === 'tickets' && (
            <div>
              <div className="space-y-4 mb-6">
                {event.ticketTypes.map((ticketType) => (
                  <div key={ticketType.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-black">{ticketType.name}</h4>
                        <p className="text-lg font-bold text-[#0d3b66] mt-1">
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
                        className="w-10 h-10 bg-[#e8f0f8] text-[#0d3b66] rounded-lg font-bold hover:bg-[#d0e2f0] disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                        className="w-10 h-10 bg-[#e8f0f8] text-[#0d3b66] rounded-lg font-bold hover:bg-[#d0e2f0] disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                  className="flex-1 border border-[#0d3b66] text-[#0d3b66] py-3 rounded-lg font-semibold hover:bg-[#e8f0f8] transition"
                >
                  Back
                </button>
                <button
                  onClick={handleProceedToCheckout}
                  disabled={totalSelected === 0}
                  className="flex-1 bg-[#0d3b66] text-white py-3 rounded-lg font-bold hover:bg-[#0a2f52] transition disabled:bg-[#7a9fc0] disabled:cursor-not-allowed"
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
                  className="w-full border-2 border-[#0d3b66] text-[#0d3b66] py-4 rounded-lg font-bold hover:bg-[#e8f0f8] transition"
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
                  className="w-full bg-[#0d3b66] text-white py-4 rounded-lg font-bold hover:bg-[#0a2f52] transition"
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
                className="w-full mt-4 text-black font-medium hover:text-[#0d3b66] transition text-sm"
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
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Email Address</label>
                  <input
                    type="email"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="john@tcd.ie"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-black"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalView('auth')}
                  className="flex-1 border border-[#0d3b66] text-[#0d3b66] py-3 rounded-lg font-semibold hover:bg-[#e8f0f8] transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setModalView('checkout')}
                  disabled={!guestInfo.name.trim() || !guestInfo.email.trim()}
                  className="flex-1 bg-[#0d3b66] text-white py-3 rounded-lg font-bold hover:bg-[#0a2f52] transition disabled:bg-[#7a9fc0] disabled:cursor-not-allowed"
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
                <h4 className="font-bold text-black mb-1">{event.title}</h4>
                <p className="text-sm text-black">{formatDate(event.startDate)}</p>
                <p className="text-sm text-black">{event.location}</p>
              </div>

              {/* Who's booking */}
              <div className="bg-[#e8f0f8] rounded-lg p-3 mb-4">
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
                    const tt = event.ticketTypes.find((t) => t.id === ticketTypeId);
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
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-black"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-[#e8f0f8] text-[#0d3b66] rounded-lg hover:bg-[#d0e2f0] transition font-medium"
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
                  className="flex-1 border border-[#0d3b66] text-[#0d3b66] py-3 rounded-lg font-semibold hover:bg-[#e8f0f8] transition"
                >
                  Back
                </button>
                <button
                  onClick={handleCompleteBooking}
                  disabled={bookingLoading}
                  className="flex-1 bg-[#0d3b66] text-white py-3 rounded-lg font-bold hover:bg-[#0a2f52] transition disabled:bg-[#7a9fc0]"
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

              <div className="bg-[#e8f0f8] rounded-lg p-4 mb-6 text-left">
                <p className="font-bold text-black">{event.title}</p>
                <p className="text-sm text-black">{formatDate(event.startDate)}</p>
                <p className="text-sm text-black">{event.location}</p>
                <p className="text-sm font-semibold text-[#0d3b66] mt-2">
                  {totalSelected} ticket{totalSelected !== 1 ? 's' : ''} - {formatPrice(total)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 border border-[#0d3b66] text-[#0d3b66] py-3 rounded-lg font-semibold hover:bg-[#e8f0f8] transition"
                >
                  {closeLabel || 'Close'}
                </button>
                {user && (
                  <button
                    onClick={() => router.push('/tickets')}
                    className="flex-1 bg-[#0d3b66] text-white py-3 rounded-lg font-bold hover:bg-[#0a2f52] transition"
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
  );
}
