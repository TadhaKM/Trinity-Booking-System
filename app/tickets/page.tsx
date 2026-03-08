'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useAuthStore } from '@/lib/auth-store';
import { Order, Ticket } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';
import SendTicketModal from '@/components/SendTicketModal';
import RefundModal from '@/components/RefundModal';

interface SendTarget {
  ticketId: string;
  ticketName: string;
  eventTitle: string;
}

/** Returns true if the event has already happened (startDate is in the past). */
function eventHasPassed(startDate: Date | string | undefined): boolean {
  if (!startDate) return false;
  return new Date(startDate) < new Date();
}

/** Returns true if the ticket is eligible for a refund request. */
function canRequestRefund(order: Order, ticket: Ticket): boolean {
  return (
    order.status === 'CONFIRMED' &&
    ticket.isRefunded !== true &&
    !eventHasPassed(order.event?.startDate)
  );
}

export default function MyTicketsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  // Send-ticket modal state
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);

  // Refund modal state
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);
  const [refundingTicketId, setRefundingTicketId] = useState<string | null>(null);

  // Track locally which tickets have had a refund requested this session
  const [refundRequestedIds, setRefundRequestedIds] = useState<Set<string>>(new Set());

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/tickets`);
      const data = await res.json();
      const fetched: Order[] = Array.isArray(data) ? data : [];
      // Keep all orders (including cancelled/refunded so users can see history)
      setOrders(fetched);

      const qrMap: Record<string, string> = {};
      for (const order of fetched) {
        for (const ticket of order.tickets) {
          if (ticket.qrCode) {
            qrMap[ticket.id] = await QRCode.toDataURL(ticket.qrCode);
          }
        }
      }
      setQrCodes(qrMap);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchTickets();
  }, [user, router, fetchTickets]);

  // Status badge for the order header
  function OrderStatusBadge({ status }: { status: Order['status'] }) {
    if (status === 'CONFIRMED') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          CONFIRMED
        </span>
      );
    }
    if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex-shrink-0">
          {status === 'PARTIALLY_REFUNDED' ? 'PARTIALLY REFUNDED' : 'REFUNDED'}
        </span>
      );
    }
    if (status === 'CANCELLED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 flex-shrink-0">
          CANCELLED
        </span>
      );
    }
    // PENDING or anything else
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex-shrink-0">
        {status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#EFF2F7]">
        <div className="w-12 h-12 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#0569b9] animate-spin" />
      </div>
    );
  }

  // Filter to non-cancelled for the count in the header, but show all
  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#EFF2F7] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-[#0569b9]/10 rounded-2xl flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-[#0569b9]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-[#0A2E6E] mb-2">No tickets yet</h2>
        <p className="text-slate-500 mb-6">Explore events and book your first ticket!</p>
        <Link
          href="/search"
          className="bg-[#0569b9] text-white px-7 py-3 rounded-full font-bold hover:bg-[#0A2E6E] transition-all shadow-lg shadow-[#0569b9]/20"
        >
          Browse Events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFF2F7] px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#0A2E6E] tracking-tight">My Tickets</h1>
          <p className="text-slate-500 mt-1">
            {activeOrders.length} active {activeOrders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-[1.5rem] shadow-lg overflow-hidden border border-slate-100"
            >
              {/* Order header */}
              <div className="p-6 flex gap-5">
                {order.event && (
                  <div className="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden">
                    <Image
                      src={order.event.imageUrl}
                      alt={order.event.title}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      {order.event && (
                        <>
                          <h2 className="text-lg font-black text-[#0A2E6E] leading-tight">
                            {order.event.title}
                          </h2>
                          <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 text-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(order.event.startDate)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {order.event.location}
                          </div>
                        </>
                      )}
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      Booked {formatDate(order.createdAt)}
                    </span>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Total</span>
                      <p className="font-black text-[#0569b9] text-base">{formatPrice(order.totalAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual tickets */}
              {order.tickets.length > 0 && (
                <div className="border-t border-slate-100 px-6 pb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-5 mb-3">
                    {order.tickets.length} {order.tickets.length === 1 ? 'Ticket' : 'Tickets'}
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.tickets.map((ticket) => {
                      const isRefunded = ticket.isRefunded === true;
                      const refundRequested = refundRequestedIds.has(ticket.id);

                      return (
                        <div
                          key={ticket.id}
                          className={`relative rounded-2xl p-4 flex flex-col gap-3 overflow-hidden ${
                            isRefunded ? 'bg-slate-100' : 'bg-[#EFF2F7]'
                          }`}
                        >
                          {/* Refunded banner */}
                          {isRefunded && (
                            <div className="absolute inset-x-0 top-0 bg-slate-400/90 text-white text-[10px] font-black uppercase tracking-widest text-center py-1 z-10">
                              Refunded
                            </div>
                          )}

                          <div className={`flex items-center justify-between ${isRefunded ? 'mt-5' : ''}`}>
                            <div>
                              <p className={`font-bold text-sm ${isRefunded ? 'text-slate-400' : 'text-[#0A2E6E]'}`}>
                                {ticket.ticketType?.name || 'Ticket'}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {ticket.price === 0 ? 'Free' : formatPrice(ticket.price)}
                              </p>
                            </div>

                            {/* Send button — hidden for refunded tickets */}
                            {!isRefunded && (
                              <button
                                onClick={() => setSendTarget({
                                  ticketId: ticket.id,
                                  ticketName: ticket.ticketType?.name || 'Ticket',
                                  eventTitle: order.event?.title || 'Event',
                                })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0569b9]/10 hover:bg-[#0569b9]/20 text-[#0569b9] text-xs font-bold rounded-xl transition-colors"
                                title="Send to a friend"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Send
                              </button>
                            )}
                          </div>

                          {/* QR code — with red X overlay when refunded */}
                          {qrCodes[ticket.id] && (
                            <div className={`relative rounded-xl p-2.5 border ${
                              isRefunded
                                ? 'bg-slate-200 border-slate-300/50'
                                : 'bg-white border-slate-200/50'
                            }`}>
                              <img
                                src={qrCodes[ticket.id]}
                                alt="QR Code"
                                className={`w-full rounded-lg ${isRefunded ? 'opacity-30 grayscale' : ''}`}
                              />
                              {/* Red X strikethrough overlay for refunded tickets */}
                              {isRefunded && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <svg
                                    className="w-3/4 h-3/4 text-red-500/80"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                              )}
                              <p className="text-center text-[10px] text-slate-400 mt-2 font-mono break-all">
                                {ticket.qrCode}
                              </p>
                            </div>
                          )}

                          {/* Action row: View Ticket pill + Refund button */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* View Ticket — digital wallet link */}
                            {!isRefunded && (
                              <a
                                href={`/tickets/${ticket.id}/card`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#0A2E6E]/10 text-[#0A2E6E] text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#0A2E6E]/20 transition-colors"
                              >
                                View Ticket
                              </a>
                            )}

                            {/* Refund request button / badge */}
                            {isRefunded || refundRequested ? (
                              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-600">
                                {isRefunded ? 'Refunded' : 'Refund requested'}
                              </span>
                            ) : canRequestRefund(order, ticket) ? (
                              <button
                                onClick={() => {
                                  setRefundingOrder(order);
                                  setRefundingTicketId(ticket.id);
                                }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                              >
                                Request Refund
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Send Ticket Modal */}
      {sendTarget && user && (
        <SendTicketModal
          ticketId={sendTarget.ticketId}
          ticketName={sendTarget.ticketName}
          eventTitle={sendTarget.eventTitle}
          senderId={user.id}
          onClose={() => setSendTarget(null)}
          onSuccess={() => {
            setSendTarget(null);
            setLoading(true);
            fetchTickets();
          }}
        />
      )}

      {/* Refund Modal */}
      {refundingOrder && (
        <RefundModal
          order={refundingOrder as any}
          tickets={refundingOrder.tickets as any}
          onClose={() => {
            setRefundingOrder(null);
            setRefundingTicketId(null);
          }}
          onSuccess={(ticketId?: string) => {
            // Mark the specific ticket (or all tickets in the order) as refund-requested
            setRefundRequestedIds((prev) => {
              const next = new Set(prev);
              if (ticketId) {
                next.add(ticketId);
              } else {
                // If the modal doesn't return a specific id, mark all non-refunded tickets
                refundingOrder.tickets.forEach((t) => {
                  if (!t.isRefunded) next.add(t.id);
                });
              }
              return next;
            });
            setRefundingOrder(null);
            setRefundingTicketId(null);
            // Re-fetch to pick up any server-side status updates
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
