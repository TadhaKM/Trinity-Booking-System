'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatDate } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventInfo {
  id: string;
  title: string;
  startDate: string;
  venueCapacity: number;
}

interface Summary {
  totalOrders: number;
  totalTickets: number;
  checkedIn: number;
  attendanceRate: number;
}

interface TicketTypeBreakdown {
  name: string;
  sold: number;
  checkedIn: number;
}

interface Attendee {
  userId: string;
  name: string;
  email: string;
  ticketType: string;
  ticketRef: string;
  orderRef: string;
  price: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
  checkedIn: boolean;
  checkedInAt: string | null;
  purchasedAt: string;
}

interface AttendeeData {
  event: EventInfo;
  summary: Summary;
  byTicketType: TicketTypeBreakdown[];
  attendees: Attendee[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

function StatusBadge({ status }: { status: Attendee['status'] }) {
  const cfg = {
    CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-orange-100 text-orange-700 border-orange-200',
    REFUNDED:  'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg[status]}`}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-extrabold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 bg-gray-200 rounded-2xl w-1/3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-[2rem]" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-[2rem]" />
      <div className="h-72 bg-gray-200 rounded-[2rem]" />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-16 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#EFF2F7] flex items-center justify-center">
        <svg className="w-8 h-8 text-[#0569b9]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <p className="text-lg font-bold text-[#0A2E6E] mb-1">No attendees yet</p>
      <p className="text-sm text-gray-400">Ticket orders will appear here once they are placed.</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendeesPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<AttendeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('');
  const [checkinFilter, setCheckinFilter] = useState<'all' | 'in' | 'out'>('all');

  // Auth guard
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!user.isOrganiser) { router.push('/'); return; }
  }, [user, router]);

  // Fetch attendees
  const fetchData = useCallback(async () => {
    if (!user || !eventId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/organiser/${user.id}/events/${eventId}/attendees`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to load attendees');
      }
      const json: AttendeeData = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [user, eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Export CSV
  const handleExportCsv = async () => {
    if (!user || !eventId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/organiser/${user.id}/events/${eventId}/attendees?format=csv`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Derived filtered list
  const filteredAttendees = (data?.attendees ?? []).filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q);
    const matchType = !ticketTypeFilter || a.ticketType === ticketTypeFilter;
    const matchCheckin =
      checkinFilter === 'all' ||
      (checkinFilter === 'in' && a.checkedIn) ||
      (checkinFilter === 'out' && !a.checkedIn);
    return matchSearch && matchType && matchCheckin;
  });

  // Ticket type options from data
  const ticketTypeOptions = data
    ? Array.from(new Set(data.attendees.map((a) => a.ticketType)))
    : [];

  // Capacity bar
  const capacityPct =
    data && data.event.venueCapacity > 0
      ? Math.min((data.summary.checkedIn / data.event.venueCapacity) * 100, 100)
      : 0;

  if (!user || !user.isOrganiser) return null;

  return (
    <div className="min-h-screen bg-[#EFF2F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-7">

        {/* ── Back + Header ── */}
        <div>
          <Link
            href="/organiser/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0569b9] hover:text-[#0A2E6E] mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {loading ? (
            <div className="h-9 bg-gray-200 rounded-xl w-64 animate-pulse" />
          ) : data ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-[#0A2E6E] leading-tight">{data.event.title}</h1>
                <p className="text-sm text-gray-500 mt-1">{formatDate(data.event.startDate)}</p>
              </div>

              {/* Capacity bar */}
              <div className="min-w-[240px] flex-1 max-w-xs bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100">
                <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                  <span>Check-In Progress</span>
                  <span className="text-[#0A2E6E]">
                    {data.summary.checkedIn} / {data.event.venueCapacity}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-[#0569b9] transition-all duration-700"
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{capacityPct.toFixed(1)}% venue capacity</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Loading / Error / Content ── */}
        {loading && <Skeleton />}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-sm font-medium">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Orders"
                value={data.summary.totalOrders}
                accent="text-[#0A2E6E]"
              />
              <StatCard
                label="Total Tickets"
                value={data.summary.totalTickets}
                accent="text-[#0569b9]"
              />
              <StatCard
                label="Checked In"
                value={data.summary.checkedIn}
                sub={`of ${data.summary.totalTickets} tickets`}
                accent="text-green-600"
              />
              <StatCard
                label="Attendance"
                value={`${data.summary.attendanceRate.toFixed(1)}%`}
                sub="of sold tickets"
                accent={data.summary.attendanceRate >= 75 ? 'text-green-600' : 'text-orange-500'}
              />
            </div>

            {/* ── Ticket Type Breakdown ── */}
            {data.byTicketType.length > 0 && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-[#0A2E6E]">Ticket Type Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#EFF2F7]">
                      <tr>
                        {['Name', 'Sold', 'Checked In', 'Rate'].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.byTicketType.map((tt) => {
                        const rate = tt.sold > 0 ? (tt.checkedIn / tt.sold) * 100 : 0;
                        return (
                          <tr key={tt.name} className="hover:bg-[#EFF2F7]/60 transition-colors">
                            <td className="px-6 py-3 text-sm font-semibold text-[#0A2E6E]">{tt.name}</td>
                            <td className="px-6 py-3 text-sm text-gray-700">{tt.sold}</td>
                            <td className="px-6 py-3 text-sm text-green-600 font-semibold">{tt.checkedIn}</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-[#0569b9]"
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">{rate.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Filter Bar ── */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 px-5 py-4">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 focus:border-[#0569b9] transition text-gray-800 placeholder-gray-400"
                  />
                </div>

                {/* Ticket type filter */}
                <select
                  value={ticketTypeFilter}
                  onChange={(e) => setTicketTypeFilter(e.target.value)}
                  className="py-2.5 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 focus:border-[#0569b9] text-gray-700 bg-white transition min-w-[160px]"
                >
                  <option value="">All Ticket Types</option>
                  {ticketTypeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Check-in status filter */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  {(
                    [
                      { key: 'all', label: 'All' },
                      { key: 'in',  label: 'Checked In' },
                      { key: 'out', label: 'Not Checked In' },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setCheckinFilter(key)}
                      className={`px-3 py-2.5 text-xs font-semibold transition-colors ${
                        checkinFilter === key
                          ? 'bg-[#0569b9] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Export CSV */}
                <button
                  onClick={handleExportCsv}
                  disabled={exporting}
                  className="ml-auto inline-flex items-center gap-2 bg-[#0A2E6E] hover:bg-[#0569b9] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 shadow-sm"
                >
                  {exporting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Exporting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── Attendee Table ── */}
            {filteredAttendees.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#0A2E6E]">
                    Attendees
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({filteredAttendees.length} shown{filteredAttendees.length !== data.attendees.length ? ` of ${data.attendees.length}` : ''})
                    </span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px]">
                    <thead className="bg-[#EFF2F7]">
                      <tr>
                        {[
                          'Name',
                          'Email',
                          'Ticket Type',
                          'Ref',
                          'Price',
                          'Status',
                          'Checked In',
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAttendees.map((a, idx) => (
                        <tr key={`${a.ticketRef}-${idx}`} className="hover:bg-[#EFF2F7]/50 transition-colors">
                          {/* Name */}
                          <td className="px-5 py-3.5 text-sm font-semibold text-[#0A2E6E] whitespace-nowrap">
                            {truncate(a.name, 24)}
                          </td>
                          {/* Email */}
                          <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                            {truncate(a.email, 28)}
                          </td>
                          {/* Ticket Type */}
                          <td className="px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                            {a.ticketType}
                          </td>
                          {/* Ref */}
                          <td className="px-5 py-3.5">
                            <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-mono whitespace-nowrap">
                              {a.ticketRef.slice(0, 8)}…
                            </code>
                          </td>
                          {/* Price */}
                          <td className="px-5 py-3.5 text-sm font-semibold text-[#0A2E6E] whitespace-nowrap">
                            {formatPrice(a.price)}
                          </td>
                          {/* Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <StatusBadge status={a.status} />
                          </td>
                          {/* Checked In */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {a.checkedIn ? (
                              <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                Yes
                              </span>
                            ) : (
                              <span className="text-gray-300 font-semibold text-sm select-none">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
