'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useAuthStore } from '@/lib/auth-store';
import { Order } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';

export default function MyTicketsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchTickets = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/tickets`);
        const data = await res.json();
        const orders = Array.isArray(data) ? data : [];
        setOrders(orders);

        // Generate QR codes for all tickets
        const qrCodesMap: Record<string, string> = {};
        for (const order of orders) {
          for (const ticket of order.tickets) {
            const qrDataUrl = await QRCode.toDataURL(ticket.qrCode);
            qrCodesMap[ticket.id] = qrDataUrl;
          }
        }
        setQrCodes(qrCodesMap);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
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
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-black mb-2">
            No tickets yet
          </h2>
          <p className="text-black mb-6">
            Start exploring events and book your first ticket!
          </p>
          <Link
            href="/search"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">My Tickets</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex gap-6">
                {order.event && (
                  <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={order.event.imageUrl}
                      alt={order.event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {order.event && (
                        <>
                          <h2 className="text-xl font-bold mb-1">
                            {order.event.title}
                          </h2>
                          <p className="text-black">
                            {formatDate(order.event.startDate)}
                          </p>
                          <p className="text-black">{order.event.location}</p>
                        </>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {order.tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold">
                                {ticket.ticketType?.name || 'Ticket'}
                              </p>
                              <p className="text-sm text-black">
                                {formatPrice(ticket.price)}
                              </p>
                            </div>
                          </div>

                          {qrCodes[ticket.id] && (
                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                              <img
                                src={qrCodes[ticket.id]}
                                alt="QR Code"
                                className="w-full"
                              />
                              <p className="text-xs text-center text-black mt-2">
                                {ticket.qrCode}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-black">
                      Order placed: {formatDate(order.createdAt)}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-black">Total paid</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatPrice(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
