'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { Event, TicketType, Coupon } from '@/lib/types';
import { formatDate, formatPrice, calculateFees, applyCoupon, isEventPast } from '@/lib/utils';
import Countdown from '@/components/Countdown';
import AddToCalendar from '@/components/AddToCalendar';
import ShareButtons from '@/components/ShareButtons';
import EventComments from '@/components/EventComments';
import EventImageGallery from '@/components/EventImageGallery';

// ─── Checkout Modal ────────────────────────────────────────────────────────────

function CheckoutModal({
  event,
  ticketSelections,
  onClose,
}: {
  event: Event;
  ticketSelections: { ticketTypeId: string; quantity: number }[];
  onClose: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = ticketSelections.reduce((sum, s) => {
    const tt = event.ticketTypes.find((t) => t.id === s.ticketTypeId);
    return sum + (tt ? tt.price * s.quantity : 0);
  }, 0);
  const discountInfo = appliedCoupon
    ? applyCoupon(subtotal, appliedCoupon.discountPercent)
    : { discount: 0, newAmount: subtotal };
  const { bookingFee, total } = calculateFees(discountInfo.newAmount);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode }),
    });
    if (res.ok) setAppliedCoupon(await res.json());
    else setCouponError((await res.json()).error || 'Invalid coupon code');
  };

  const handleCheckout = async () => {
    if (!user) { router.push('/login'); return; }
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
      if (res.ok) router.push('/tickets');
      else alert((await res.json()).error || 'Booking failed');
    } catch { alert('An error occurred during checkout'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[2rem] max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-[#0A2E6E]">Checkout</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 p-3 bg-[#EFF2F7] rounded-xl">
            <p className="font-semibold text-[#0A2E6E] text-sm">{event.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.startDate)}</p>
          </div>

          <div className="space-y-3 mb-6">
            {ticketSelections.map((s) => {
              const tt = event.ticketTypes.find((t) => t.id === s.ticketTypeId);
              if (!tt) return null;
              return (
                <div key={s.ticketTypeId} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-[#0A2E6E] text-sm">{tt.name}</p>
                    <p className="text-xs text-gray-500">{s.quantity}× {formatPrice(tt.price)}</p>
                  </div>
                  <p className="font-semibold text-[#0A2E6E]">{formatPrice(tt.price * s.quantity)}</p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({appliedCoupon.discountPercent}%)</span>
                <span>-{formatPrice(discountInfo.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>Booking Fee (5%)</span><span>{formatPrice(bookingFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-[#0A2E6E] pt-2 border-t border-gray-100">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>

          {!appliedCoupon && (
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME2026"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                />
                <button onClick={handleApplyCoupon} className="px-4 py-2 bg-[#EFF2F7] text-[#0A2E6E] rounded-xl font-medium text-sm hover:bg-gray-200 transition">
                  Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-[#0569b9] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#0A2E6E] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Complete Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Accordion ─────────────────────────────────────────────────────────────

function FAQAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-semibold text-[#0A2E6E] hover:bg-[#EFF2F7] transition"
          >
            <span>{item.q}</span>
            <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIdx === i && (
            <div className="px-4 pb-3 text-sm text-gray-600 bg-[#EFF2F7]/50">{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Waitlist Button ──────────────────────────────────────────────────────────

function WaitlistButton({ ticketType, userId, eventId }: { ticketType: TicketType; userId: string; eventId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'joined' | 'error'>('idle');
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/waitlist/status?userId=${userId}&ticketTypeId=${ticketType.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.onWaitlist) { setStatus('joined'); setPosition(d.position); }
      })
      .catch(() => {});
  }, [userId, ticketType.id]);

  const handleJoin = async () => {
    setStatus('loading');
    const res = await fetch('/api/waitlist/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ticketTypeId: ticketType.id, eventId }),
    });
    const data = await res.json();
    if (res.ok || data.alreadyJoined) {
      setStatus('joined');
      setPosition(data.entry?.position ?? null);
    } else {
      setStatus('error');
    }
  };

  if (status === 'joined') {
    return (
      <div className="flex items-center gap-2 text-sm text-[#0569b9] font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        On waitlist{position ? ` — position #${position}` : ''}
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={status === 'loading'}
      className="text-sm font-semibold px-4 py-2 rounded-xl border border-[#0569b9] text-[#0569b9] hover:bg-[#0569b9] hover:text-white transition disabled:opacity-50"
    >
      {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setEvent(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  // Check saved status
  useEffect(() => {
    if (!user || !eventId) return;
    fetch(`/api/events/${eventId}/save?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => setSaved(d.saved))
      .catch(() => {});
  }, [user, eventId]);

  const toggleSave = async () => {
    if (!user) { router.push('/login'); return; }
    setSavingToggle(true);
    try {
      if (saved) {
        await fetch(`/api/events/${eventId}/save?userId=${user.id}`, { method: 'DELETE' });
        setSaved(false);
      } else {
        await fetch(`/api/events/${eventId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        setSaved(true);
      }
    } finally { setSavingToggle(false); }
  };

  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    setTicketSelections((prev) => ({ ...prev, [ticketTypeId]: Math.max(0, quantity) }));
  };

  const handleBookNow = () => {
    if (!user) { router.push('/login'); return; }
    const selections = Object.entries(ticketSelections)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
    if (selections.length === 0) { alert('Please select at least one ticket'); return; }
    setShowCheckout(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0569b9]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-xl font-bold text-[#0A2E6E]">Event not found</p>
        <Link href="/" className="text-[#0569b9] hover:underline text-sm">Return to Home</Link>
      </div>
    );
  }

  const totalSelected = Object.values(ticketSelections).reduce((s, q) => s + q, 0);
  const isPast = isEventPast(event.endDate);
  const allSoldOut = event.ticketTypes.every((tt) => tt.available === 0);

  let faqItems: { q: string; a: string }[] = [];
  try { if ((event as any).faqJson) faqItems = JSON.parse((event as any).faqJson); } catch {}

  const policy = (event as any).policy as string | undefined;
  const venueCapacity = (event as any).venueCapacity as number | null | undefined;
  const totalSold = event.ticketTypes.reduce((s, tt) => s + (tt.quantity - tt.available), 0);
  const occupancyPct = venueCapacity ? Math.round((totalSold / venueCapacity) * 100) : null;

  // Build gallery images array
  let galleryImages: string[] = [];
  try {
    const raw = (event as any).galleryImages;
    if (raw) galleryImages = JSON.parse(raw);
  } catch {}
  const allImages = [event.imageUrl, ...galleryImages].filter(Boolean);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const eventUrl = `${siteUrl}/events/${event.id}`;

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero Image / Gallery */}
        <div className="relative">
          <EventImageGallery images={allImages} title={event.title} />

          {/* Save + Share overlay */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <ShareButtons title={event.title} url={eventUrl} description={event.description?.slice(0, 120)} />
            <button
              onClick={toggleSave}
              disabled={savingToggle}
              className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm shadow-md hover:scale-105 transition-transform"
              title={saved ? 'Remove from saved' : 'Save event'}
            >
              <svg
                className={`w-5 h-5 transition-colors ${saved ? 'text-[#0569b9] fill-[#0569b9]' : 'text-gray-500'}`}
                fill={saved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          {/* Venue occupancy badge */}
          {occupancyPct !== null && (
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              {occupancyPct}% full
              {occupancyPct >= 90 && <span className="ml-1 text-orange-300">— almost sold out</span>}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left: Event Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Title & Meta */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="bg-[#EFF2F7] text-[#0569b9] px-3 py-1 rounded-full text-xs font-semibold">
                  {event.category}
                </span>
                {(event.tags || []).map((tag) => (
                  <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
                    #{tag}
                  </span>
                ))}
                {isPast && (
                  <span className="bg-red-50 text-red-500 px-3 py-1 rounded-full text-xs font-semibold">Past Event</span>
                )}
              </div>

              <h1 className="text-3xl font-extrabold text-[#0A2E6E]">{event.title}</h1>

              {event.society && (
                <Link
                  href={`/societies/${event.societyId}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0569b9] hover:text-[#0A2E6E] transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.society.name}
                </Link>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF2F7] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#0569b9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date & Time</p>
                    <p className="text-sm font-semibold text-[#0A2E6E]">{formatDate(event.startDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF2F7] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#0569b9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</p>
                    <p className="text-sm font-semibold text-[#0A2E6E]">{event.location}</p>
                  </div>
                </div>
              </div>

              {/* Countdown */}
              {!isPast && (
                <div className="pt-3 border-t border-gray-100">
                  <Countdown targetDate={event.startDate} />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-[#0A2E6E] mb-3">About This Event</h2>
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{event.description}</p>
            </div>

            {/* FAQ */}
            {faqItems.length > 0 && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-[#0A2E6E] mb-4">FAQ</h2>
                <FAQAccordion items={faqItems} />
              </div>
            )}

            {/* Policy */}
            {policy && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-[#0A2E6E] mb-3">Refund & Transfer Policy</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{policy}</p>
              </div>
            )}
          </div>

          {/* Right: Tickets Panel */}
          <div className="space-y-4">

            {/* Add to Calendar */}
            {!isPast && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5">
                <AddToCalendar event={event} />
              </div>
            )}

            {/* Ticket Types */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-[#0A2E6E] mb-4">Select Tickets</h2>

              {isPast ? (
                <p className="text-sm text-gray-500 text-center py-4">This event has ended.</p>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {event.ticketTypes.map((tt) => {
                      const isSoldOut = tt.available === 0;
                      const isLow = tt.available > 0 && tt.available <= 5;

                      return (
                        <div key={tt.id} className={`rounded-xl border p-3 ${isSoldOut ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-sm text-[#0A2E6E]">{tt.name}</p>
                              <p className="text-base font-bold text-[#0569b9]">
                                {tt.price === 0 ? 'Free' : formatPrice(tt.price)}
                              </p>
                            </div>
                            <div className="text-right">
                              {isSoldOut ? (
                                <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Sold out</span>
                              ) : isLow ? (
                                <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                                  {tt.available} left
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">{tt.available} left</span>
                              )}
                            </div>
                          </div>

                          {isSoldOut ? (
                            user ? (
                              <WaitlistButton ticketType={tt} userId={user.id} eventId={eventId} />
                            ) : (
                              <Link href="/login" className="text-xs text-[#0569b9] font-medium">Login to join waitlist</Link>
                            )
                          ) : (
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleQuantityChange(tt.id, (ticketSelections[tt.id] || 0) - 1)}
                                disabled={!ticketSelections[tt.id]}
                                className="w-8 h-8 bg-[#EFF2F7] text-[#0569b9] rounded-lg font-bold text-sm hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-bold text-[#0A2E6E] text-sm">
                                {ticketSelections[tt.id] || 0}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(tt.id, (ticketSelections[tt.id] || 0) + 1)}
                                disabled={(ticketSelections[tt.id] || 0) >= tt.available}
                                className="w-8 h-8 bg-[#EFF2F7] text-[#0569b9] rounded-lg font-bold text-sm hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!allSoldOut && (
                    <button
                      onClick={handleBookNow}
                      disabled={totalSelected === 0}
                      className="w-full bg-[#0569b9] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#0A2E6E] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {totalSelected === 0
                        ? 'Select Tickets'
                        : `Book ${totalSelected} Ticket${totalSelected !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Comments / Q&A */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-[#0A2E6E] mb-4">Questions &amp; Comments</h2>
          <EventComments eventId={event.id} organiserId={event.organiserId} />
        </div>

      </div>

      {showCheckout && (
        <CheckoutModal
          event={event}
          ticketSelections={Object.entries(ticketSelections)
            .filter(([, qty]) => qty > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
