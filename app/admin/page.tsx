'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatDate } from '@/lib/utils';

// ─── Tab type ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'events' | 'orders' | 'refunds' | 'audit';

// ─── Shared types ─────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalOrders: number;
  totalRevenue: number;
  pendingRefunds: number;
  bannedUsers: number;
}

interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isOrganiser: boolean;
  isBanned?: boolean;
  createdAt: string;
  _count?: { orders: number };
}

interface AdminEvent {
  id: string;
  title: string;
  society: string;
  category: string;
  startDate: string;
  isPublished: boolean;
  isCancelled: boolean;
}

interface AdminOrder {
  id: string;
  userName: string;
  userEmail: string;
  eventTitle: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface RefundItem {
  id: string;
  userName: string;
  userEmail: string;
  eventTitle: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  createdAt: string;
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  return (
    <div className={`animate-spin rounded-full border-b-2 border-[#0569b9] ${sz}`} />
  );
}

function LoadingCenter() {
  return (
    <div className="flex justify-center items-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
      {message}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  bg,
}: {
  label: string;
  value: string | number;
  accent: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-[2rem] p-5 shadow-sm border border-white/60`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    CONFIRMED:  'bg-green-100 text-green-700',
    CANCELLED:  'bg-orange-100 text-orange-700',
    REFUNDED:   'bg-red-100 text-red-700',
    PENDING:    'bg-yellow-100 text-yellow-700',
    APPROVED:   'bg-blue-100 text-blue-700',
    REJECTED:   'bg-red-100 text-red-700',
    PROCESSED:  'bg-green-100 text-green-700',
    BANNED:     'bg-red-100 text-red-700',
    ACTIVE:     'bg-green-100 text-green-700',
    PUBLISHED:  'bg-green-100 text-green-700',
    UNPUBLISHED:'bg-gray-100 text-gray-600',
  };
  const cls = map[status.toUpperCase()] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-[#EFF2F7]">
      <tr>
        {cols.map((c) => (
          <th key={c} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  stats,
  recentAudit,
  onTabChange,
}: {
  stats: AdminStats;
  recentAudit: AuditEntry[];
  onTabChange: (t: Tab) => void;
}) {
  return (
    <div className="space-y-7">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Users"      value={stats.totalUsers}           accent="text-[#0A2E6E]"   bg="bg-white" />
        <StatCard label="Total Events"     value={stats.totalEvents}          accent="text-[#0569b9]"   bg="bg-white" />
        <StatCard label="Total Orders"     value={stats.totalOrders}          accent="text-indigo-600"  bg="bg-white" />
        <StatCard label="Total Revenue"    value={formatPrice(stats.totalRevenue)} accent="text-green-600"  bg="bg-white" />
        <StatCard label="Pending Refunds"  value={stats.pendingRefunds}       accent="text-orange-500"  bg="bg-orange-50" />
        <StatCard label="Banned Users"     value={stats.bannedUsers}          accent="text-red-600"     bg="bg-red-50" />
      </div>

      {/* Quick action cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <button
          onClick={() => onTabChange('refunds')}
          className="bg-white rounded-[2rem] border border-orange-200 p-5 text-left hover:shadow-md transition group shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#0A2E6E] group-hover:text-[#0569b9] transition">Review Pending Refunds</span>
            {stats.pendingRefunds > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {stats.pendingRefunds}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">Approve or reject open refund requests.</p>
        </button>

        <Link
          href="/admin/reported"
          className="bg-white rounded-[2rem] border border-gray-200 p-5 hover:shadow-md transition group shadow-sm block"
        >
          <p className="text-sm font-bold text-[#0A2E6E] group-hover:text-[#0569b9] transition mb-2">Reported Events</p>
          <p className="text-xs text-gray-400">Review user-submitted event reports.</p>
        </Link>

        <button
          onClick={() => onTabChange('users')}
          className="bg-white rounded-[2rem] border border-red-200 p-5 text-left hover:shadow-md transition group shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#0A2E6E] group-hover:text-[#0569b9] transition">Banned Users</span>
            {stats.bannedUsers > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {stats.bannedUsers}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">Manage banned accounts.</p>
        </button>
      </div>

      {/* Recent audit log */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0A2E6E]">Recent Activity</h2>
          <button
            onClick={() => onTabChange('audit')}
            className="text-xs font-semibold text-[#0569b9] hover:text-[#0A2E6E] transition"
          >
            View all
          </button>
        </div>
        {recentAudit.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-400 text-center">No recent activity.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <TableHead cols={['Actor', 'Action', 'Entity', 'Time']} />
              <tbody className="divide-y divide-gray-100">
                {recentAudit.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#EFF2F7]/60 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-gray-500">{entry.actorId.slice(0, 12)}…</td>
                    <td className="px-5 py-3 text-sm font-semibold text-[#0A2E6E]">{entry.action}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      <span className="font-medium">{entry.entityType}</span>
                      <span className="text-gray-400 ml-1 text-xs font-mono">{entry.entityId.slice(0, 8)}…</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ adminId }: { adminId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banConfirmId, setBanConfirmId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?adminId=${adminId}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBan = async (userId: string) => {
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isBanned: true } : u));
    } catch {
      alert('Failed to ban user.');
    } finally {
      setActionLoading(null);
      setBanConfirmId(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isBanned: false } : u));
    } catch {
      alert('Failed to unban user.');
    } finally {
      setActionLoading(null);
    }
  };

  const roleLabel = (u: AdminUser) => {
    if (u.isAdmin) return 'Admin';
    if (u.isOrganiser) return 'Organiser';
    return 'User';
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-4">
        <h2 className="text-base font-bold text-[#0A2E6E] flex-1">Users ({filtered.length})</h2>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 focus:border-[#0569b9] text-gray-800 placeholder-gray-400"
          />
        </div>
        <button onClick={fetchUsers} className="text-xs font-semibold text-[#0569b9] hover:text-[#0A2E6E] transition">
          Refresh
        </button>
      </div>

      {loading ? <LoadingCenter /> : error ? <div className="p-6"><ErrorBanner message={error} /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <TableHead cols={['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[#EFF2F7]/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#0A2E6E]">{u.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={roleLabel(u)} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={u.isBanned ? 'Banned' : 'Active'} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString('en-IE')}
                  </td>
                  <td className="px-5 py-3.5">
                    {!u.isAdmin && (
                      u.isBanned ? (
                        <button
                          onClick={() => handleUnban(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-xs font-semibold text-green-600 hover:text-green-800 transition disabled:opacity-50"
                        >
                          {actionLoading === u.id ? 'Unbanning…' : 'Unban'}
                        </button>
                      ) : banConfirmId === u.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Ban this user?</span>
                          <button
                            onClick={() => handleBan(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-xs font-bold text-red-600 hover:text-red-800 transition disabled:opacity-50"
                          >
                            {actionLoading === u.id ? 'Banning…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setBanConfirmId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setBanConfirmId(u.id)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                        >
                          Ban
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ adminId }: { adminId: string }) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/events?adminId=${adminId}`);
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : data.events ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleUnpublish = async (eventId: string) => {
    setActionLoading(eventId);
    try {
      await fetch(`/api/admin/events/${eventId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, action: 'UNPUBLISH' }),
      });
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, isPublished: false } : e));
    } catch {
      alert('Failed to unpublish event.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (eventId: string) => {
    setActionLoading(eventId);
    try {
      await fetch(`/api/admin/events/${eventId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, action: 'CANCEL' }),
      });
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, isCancelled: true } : e));
    } catch {
      alert('Failed to cancel event.');
    } finally {
      setActionLoading(null);
      setCancelConfirmId(null);
    }
  };

  const categories = Array.from(new Set(events.map((e) => e.category).filter(Boolean)));

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.society?.toLowerCase().includes(q);
    const matchCat = !categoryFilter || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const eventStatus = (e: AdminEvent) => {
    if (e.isCancelled) return 'Cancelled';
    if (e.isPublished) return 'Published';
    return 'Unpublished';
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-[#0A2E6E] flex-1">Events ({filtered.length})</h2>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 focus:border-[#0569b9] text-gray-800 placeholder-gray-400"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 text-gray-700 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={fetchEvents} className="text-xs font-semibold text-[#0569b9] hover:text-[#0A2E6E] transition">
          Refresh
        </button>
      </div>

      {loading ? <LoadingCenter /> : error ? <div className="p-6"><ErrorBanner message={error} /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <TableHead cols={['Title', 'Society', 'Date', 'Status', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-[#EFF2F7]/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#0A2E6E] max-w-[220px] truncate">{e.title}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{e.society}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(e.startDate).toLocaleDateString('en-IE')}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={eventStatus(e)} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      {e.isPublished && !e.isCancelled && (
                        <button
                          onClick={() => handleUnpublish(e.id)}
                          disabled={actionLoading === e.id}
                          className="text-xs font-semibold text-orange-500 hover:text-orange-700 transition disabled:opacity-50"
                        >
                          {actionLoading === e.id ? '…' : 'Unpublish'}
                        </button>
                      )}
                      {!e.isCancelled && (
                        cancelConfirmId === e.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Cancel event?</span>
                            <button
                              onClick={() => handleCancel(e.id)}
                              disabled={actionLoading === e.id}
                              className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              {actionLoading === e.id ? '…' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setCancelConfirmId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancelConfirmId(e.id)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                          >
                            Cancel
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab({ adminId }: { adminId: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders?adminId=${adminId}`);
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.orders ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, status: newStatus }),
      });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch {
      alert('Failed to update order.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#0A2E6E]">Orders ({orders.length})</h2>
        <button onClick={fetchOrders} className="text-xs font-semibold text-[#0569b9] hover:text-[#0A2E6E] transition">
          Refresh
        </button>
      </div>

      {loading ? <LoadingCenter /> : error ? <div className="p-6"><ErrorBanner message={error} /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <TableHead cols={['Order ID', 'User', 'Event', 'Amount', 'Status', 'Date', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#EFF2F7]/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-mono">
                      {o.id.slice(0, 10)}…
                    </code>
                  </td>
                  <td className="px-5 py-3.5 text-sm">
                    <p className="font-semibold text-[#0A2E6E]">{o.userName}</p>
                    <p className="text-xs text-gray-400">{o.userEmail}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 max-w-[160px] truncate">{o.eventTitle}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-[#0A2E6E] whitespace-nowrap">
                    {formatPrice(o.totalAmount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString('en-IE')}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusUpdate(o.id, 'CANCELLED')}
                          disabled={actionLoading === o.id}
                          className="text-xs font-semibold text-orange-500 hover:text-orange-700 disabled:opacity-50 transition"
                        >
                          {actionLoading === o.id ? '…' : 'Cancel'}
                        </button>
                      )}
                      {o.status === 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusUpdate(o.id, 'CONFIRMED')}
                          disabled={actionLoading === o.id}
                          className="text-xs font-semibold text-green-600 hover:text-green-800 disabled:opacity-50 transition"
                        >
                          {actionLoading === o.id ? '…' : 'Reinstate'}
                        </button>
                      )}
                      {o.status !== 'REFUNDED' && (
                        <button
                          onClick={() => handleStatusUpdate(o.id, 'REFUNDED')}
                          disabled={actionLoading === o.id}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition"
                        >
                          {actionLoading === o.id ? '…' : 'Mark Refunded'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Refunds Tab ──────────────────────────────────────────────────────────────

const REFUND_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'] as const;
type RefundStatus = typeof REFUND_STATUSES[number];

function RefundsTab({ adminId }: { adminId: string }) {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<RefundStatus>('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Inline reject form: maps refundId -> reviewNote
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);

  const fetchRefunds = useCallback(async (status: RefundStatus) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/refunds?adminId=${adminId}&status=${status}`);
      if (!res.ok) throw new Error('Failed to load refunds');
      const data = await res.json();
      setRefunds(Array.isArray(data) ? data : data.refunds ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => { fetchRefunds(statusFilter); }, [fetchRefunds, statusFilter]);

  const handleApprove = async (refundId: string) => {
    setActionLoading(refundId);
    try {
      await fetch(`/api/refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, action: 'APPROVE' }),
      });
      setRefunds((prev) => prev.filter((r) => r.id !== refundId));
    } catch {
      alert('Failed to approve refund.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (refundId: string) => {
    const note = rejectNote[refundId] || '';
    setActionLoading(refundId);
    try {
      await fetch(`/api/refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, action: 'REJECT', reviewNote: note }),
      });
      setRefunds((prev) => prev.filter((r) => r.id !== refundId));
      setRejectOpen(null);
    } catch {
      alert('Failed to reject refund.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-[#0A2E6E] flex-1">Refunds</h2>
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {REFUND_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-[#0569b9] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchRefunds(statusFilter)}
          className="text-xs font-semibold text-[#0569b9] hover:text-[#0A2E6E] transition"
        >
          Refresh
        </button>
      </div>

      {loading ? <LoadingCenter /> : error ? <div className="p-6"><ErrorBanner message={error} /></div> : refunds.length === 0 ? (
        <div className="px-6 py-12 text-sm text-gray-400 text-center">
          No {statusFilter.toLowerCase()} refunds.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <TableHead cols={['User', 'Event', 'Amount', 'Reason', 'Status', 'Date', 'Actions']} />
            <tbody className="divide-y divide-gray-100">
              {refunds.map((r) => (
                <>
                  <tr key={r.id} className="hover:bg-[#EFF2F7]/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm">
                      <p className="font-semibold text-[#0A2E6E]">{r.userName}</p>
                      <p className="text-xs text-gray-400">{r.userEmail}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 max-w-[150px] truncate">{r.eventTitle}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-[#0A2E6E] whitespace-nowrap">
                      {formatPrice(r.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 max-w-[180px]">
                      <span title={r.reason}>
                        {r.reason.length > 40 ? r.reason.slice(0, 39) + '…' : r.reason}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-IE')}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actionLoading === r.id}
                            className="text-xs font-bold text-green-600 hover:text-green-800 transition disabled:opacity-50"
                          >
                            {actionLoading === r.id ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() =>
                              setRejectOpen((prev) => (prev === r.id ? null : r.id))
                            }
                            className="text-xs font-bold text-red-500 hover:text-red-700 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {/* Inline reject form */}
                  {rejectOpen === r.id && (
                    <tr key={`${r.id}-reject`} className="bg-red-50/40">
                      <td colSpan={7} className="px-5 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <input
                            type="text"
                            placeholder="Rejection note (optional)…"
                            value={rejectNote[r.id] || ''}
                            onChange={(e) =>
                              setRejectNote((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            className="flex-1 min-w-[200px] text-sm border border-red-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-800 bg-white"
                          />
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={actionLoading === r.id}
                            className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
                          >
                            {actionLoading === r.id ? 'Rejecting…' : 'Confirm Reject'}
                          </button>
                          <button
                            onClick={() => setRejectOpen(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function AuditLogTab({ adminId }: { adminId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const fetchAudit = useCallback(async (pageNum: number, action: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        adminId,
        skip: String(pageNum * PAGE_SIZE),
        take: String(PAGE_SIZE),
      });
      if (action) params.set('action', action);
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load audit log');
      const data = await res.json();
      const rows: AuditEntry[] = Array.isArray(data) ? data : data.entries ?? [];
      setEntries(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => { fetchAudit(page, actionFilter); }, [fetchAudit, page, actionFilter]);

  const handleActionFilterChange = (val: string) => {
    setActionFilter(val);
    setPage(0);
  };

  const ACTIONS = [
    'BAN_USER', 'UNBAN_USER', 'UNPUBLISH_EVENT', 'CANCEL_EVENT',
    'APPROVE_REFUND', 'REJECT_REFUND', 'DELETE_USER', 'DELETE_EVENT',
  ];

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-[#0A2E6E] flex-1">Audit Log</h2>
        <select
          value={actionFilter}
          onChange={(e) => handleActionFilterChange(e.target.value)}
          className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 text-gray-700 bg-white"
        >
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button
          onClick={() => fetchAudit(page, actionFilter)}
          className="text-xs font-semibold text-[#0569b9] hover:text-[#0A2E6E] transition"
        >
          Refresh
        </button>
      </div>

      {loading ? <LoadingCenter /> : error ? <div className="p-6"><ErrorBanner message={error} /></div> : entries.length === 0 ? (
        <div className="px-6 py-12 text-sm text-gray-400 text-center">No audit entries found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <TableHead cols={['Actor ID', 'Action', 'Entity Type', 'Entity ID', 'Details', 'Time']} />
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-[#EFF2F7]/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-gray-500">{e.actorId.slice(0, 12)}…</td>
                    <td className="px-5 py-3 text-sm font-semibold text-[#0A2E6E]">{e.action}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{e.entityType}</td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-400">{e.entityId.slice(0, 12)}…</td>
                    <td className="px-5 py-3 text-xs text-gray-500 max-w-[180px] truncate" title={e.details}>
                      {e.details || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Page {page + 1} — showing {entries.length} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-4 py-2 text-xs font-semibold bg-[#0569b9] text-white rounded-xl hover:bg-[#0A2E6E] disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview'  },
  { key: 'users',    label: 'Users'     },
  { key: 'events',   label: 'Events'    },
  { key: 'orders',   label: 'Orders'    },
  { key: 'refunds',  label: 'Refunds'   },
  { key: 'audit',    label: 'Audit Log' },
];

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('overview');

  // Overview-only state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');

  // Auth guard
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!user.isAdmin) return; // show access denied below
  }, [user, router]);

  // Fetch overview data
  useEffect(() => {
    if (!user?.isAdmin) return;
    const load = async () => {
      setOverviewLoading(true);
      setOverviewError('');
      try {
        const [statsRes, auditRes] = await Promise.all([
          fetch('/api/admin/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: user.id }),
          }),
          fetch(`/api/admin/audit-log?adminId=${user.id}&take=5`),
        ]);
        const statsData = await statsRes.json();
        const auditData = await auditRes.json();
        setStats({
          totalUsers:     statsData.totalUsers     ?? 0,
          totalEvents:    statsData.totalEvents    ?? 0,
          totalOrders:    statsData.totalOrders    ?? 0,
          totalRevenue:   statsData.totalRevenue   ?? 0,
          pendingRefunds: statsData.pendingRefunds ?? 0,
          bannedUsers:    statsData.bannedUsers    ?? 0,
        });
        setRecentAudit(Array.isArray(auditData) ? auditData.slice(0, 5) : (auditData.entries ?? []).slice(0, 5));
      } catch {
        setOverviewError('Failed to load overview data.');
      } finally {
        setOverviewLoading(false);
      }
    };
    load();
  }, [user]);

  // Not logged in — handled by redirect
  if (!user) return null;

  // Access denied
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center p-6">
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-12 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-[#0A2E6E] mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-6">You do not have administrator privileges to view this page.</p>
          <Link
            href="/"
            className="inline-block bg-[#0569b9] hover:bg-[#0A2E6E] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFF2F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-7">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-3xl font-extrabold text-[#0A2E6E]">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Full platform management — {user.name}</p>
        </div>

        {/* ── Tab bar ── */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-1.5 flex flex-wrap gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-2xl text-sm font-semibold transition-all ${
                tab === key
                  ? 'bg-[#0A2E6E] text-white shadow-sm'
                  : 'text-gray-500 hover:text-[#0A2E6E] hover:bg-[#EFF2F7]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {tab === 'overview' && (
          overviewLoading ? (
            <LoadingCenter />
          ) : overviewError ? (
            <ErrorBanner message={overviewError} />
          ) : stats ? (
            <OverviewTab
              stats={stats}
              recentAudit={recentAudit}
              onTabChange={setTab}
            />
          ) : null
        )}

        {tab === 'users'   && <UsersTab   adminId={user.id} />}
        {tab === 'events'  && <EventsTab  adminId={user.id} />}
        {tab === 'orders'  && <OrdersTab  adminId={user.id} />}
        {tab === 'refunds' && <RefundsTab adminId={user.id} />}
        {tab === 'audit'   && <AuditLogTab adminId={user.id} />}

      </div>
    </div>
  );
}
