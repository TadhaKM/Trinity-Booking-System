'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice } from '@/lib/utils';

type Tab = 'overview' | 'users' | 'events' | 'orders';

interface Stats {
  totalUsers: number;
  totalEvents: number;
  totalOrders: number;
  totalSocieties: number;
  totalRevenue: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  isOrganiser: boolean;
  isAdmin: boolean;
  createdAt: string;
  _count: { orders: number };
}

interface AdminEvent {
  id: string;
  title: string;
  society: string;
  category: string;
  startDate: string;
  location: string;
  totalCapacity: number;
  totalAvailable: number;
  orders: number;
  organiserId: string;
}

interface AdminOrder {
  id: string;
  userName: string;
  userEmail: string;
  eventTitle: string;
  ticketCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.isAdmin) {
      router.push('/');
      return;
    }
    fetchStats();
  }, [user, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user!.id }),
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: user!.id, action: 'list' }),
    });
    setUsers(await res.json());
  };

  const fetchEvents = async () => {
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: user!.id }),
    });
    setEvents(await res.json());
  };

  const fetchOrders = async () => {
    const res = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: user!.id }),
    });
    setOrders(await res.json());
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'users' && users.length === 0) fetchUsers();
    if (newTab === 'events' && events.length === 0) fetchEvents();
    if (newTab === 'orders' && orders.length === 0) fetchOrders();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete their orders.')) return;
    setActionLoading(userId);
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user!.id, action: 'delete', targetUserId: userId }),
      });
      setUsers(users.filter((u) => u.id !== userId));
      fetchStats();
    } catch (error) {
      alert('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleOrganiser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user!.id, action: 'toggleOrganiser', targetUserId: userId }),
      });
      const data = await res.json();
      setUsers(users.map((u) => (u.id === userId ? { ...u, isOrganiser: data.isOrganiser } : u)));
    } catch (error) {
      alert('Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all associated orders and tickets.')) return;
    setActionLoading(eventId);
    try {
      await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user!.id }),
      });
      setEvents(events.filter((e) => e.id !== eventId));
      fetchStats();
    } catch (error) {
      alert('Failed to delete event');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? Tickets will be refunded to availability.')) return;
    setActionLoading(orderId);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user!.id }),
      });
      setOrders(orders.filter((o) => o.id !== orderId));
      fetchStats();
    } catch (error) {
      alert('Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setActionLoading(orderId);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user!.id, status }),
      });
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (error) {
      alert('Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Full site management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
        {(['overview', 'users', 'events', 'orders'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition ${
              tab === t
                ? 'bg-[#0E73B9] text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && stats && (
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Users', value: stats.totalUsers, color: 'text-blue-600' },
            { label: 'Events', value: stats.totalEvents, color: 'text-purple-600' },
            { label: 'Orders', value: stats.totalOrders, color: 'text-green-600' },
            { label: 'Societies', value: stats.totalSocieties, color: 'text-orange-600' },
            { label: 'Revenue', value: formatPrice(stats.totalRevenue), color: 'text-emerald-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-black">All Users ({users.length})</h2>
            <button onClick={fetchUsers} className="text-sm text-[#0E73B9] hover:underline">
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-black font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        {u.isAdmin && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Admin</span>
                        )}
                        {u.isOrganiser && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Organiser</span>
                        )}
                        {!u.isOrganiser && !u.isAdmin && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">Customer</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u._count.orders}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {!u.isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleOrganiser(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-[#0E73B9] hover:underline text-xs disabled:opacity-50"
                          >
                            {u.isOrganiser ? 'Remove Organiser' : 'Make Organiser'}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-red-600 hover:underline text-xs disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-black">All Events ({events.length})</h2>
            <button onClick={fetchEvents} className="text-sm text-[#0E73B9] hover:underline">
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Society</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-black font-medium">{e.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.society}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(e.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.location}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {e.totalCapacity - e.totalAvailable}/{e.totalCapacity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.orders}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <a
                          href={`/organiser/edit-event/${e.id}`}
                          className="text-[#0E73B9] hover:underline text-xs"
                        >
                          Edit
                        </a>
                        <button
                          onClick={() => deleteEvent(e.id)}
                          disabled={actionLoading === e.id}
                          className="text-red-600 hover:underline text-xs disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-black">All Orders ({orders.length})</h2>
            <button onClick={fetchOrders} className="text-sm text-[#0E73B9] hover:underline">
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="text-black font-medium">{o.userName}</div>
                      <div className="text-gray-500 text-xs">{o.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.eventTitle}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.ticketCount}</td>
                    <td className="px-4 py-3 text-sm text-black font-medium">
                      {formatPrice(o.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          o.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : o.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        {o.status === 'CONFIRMED' && (
                          <button
                            onClick={() => updateOrderStatus(o.id, 'CANCELLED')}
                            disabled={actionLoading === o.id}
                            className="text-yellow-600 hover:underline text-xs disabled:opacity-50"
                          >
                            Mark Cancelled
                          </button>
                        )}
                        {o.status === 'CANCELLED' && (
                          <button
                            onClick={() => updateOrderStatus(o.id, 'CONFIRMED')}
                            disabled={actionLoading === o.id}
                            className="text-green-600 hover:underline text-xs disabled:opacity-50"
                          >
                            Reinstate
                          </button>
                        )}
                        <button
                          onClick={() => cancelOrder(o.id)}
                          disabled={actionLoading === o.id}
                          className="text-red-600 hover:underline text-xs disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
