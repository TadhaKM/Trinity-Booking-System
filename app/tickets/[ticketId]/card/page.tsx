'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketCardData {
  id: string;
  qrCode: string;
  price: number;
  isRefunded: boolean;
  refundedAt: string | null;
  checkedInAt: string | null;
  createdAt: string;
  ticketType: {
    id: string;
    name: string;
    price: number;
  };
  order: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    event: {
      id: string;
      title: string;
      startDate: string;
      endDate: string;
      location: string;
      category: string;
      imageUrl: string;
      society: {
        id: string;
        name: string;
        category: string;
        imageUrl: string;
      };
    };
  };
}

// ─── Category gradient map ────────────────────────────────────────────────────

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Arts & Culture':     'from-purple-600 via-pink-500 to-rose-500',
  'Academic':           'from-blue-700 via-blue-500 to-cyan-400',
  'Music':              'from-violet-600 via-fuchsia-500 to-pink-400',
  'Sports & Fitness':   'from-green-600 via-emerald-500 to-teal-400',
  'Debate & Speaking':  'from-amber-600 via-orange-500 to-yellow-400',
  'Social':             'from-sky-600 via-blue-500 to-indigo-400',
};

function getCategoryGradient(category: string): string {
  return CATEGORY_GRADIENTS[category] ?? 'from-[#0A2E6E] via-[#0569b9] to-blue-400';
}

// ─── Helper: format date/time nicely ─────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Rank badge colours ───────────────────────────────────────────────────────

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-pulse">
        <div className="h-52 bg-slate-300" />
        <div className="p-6 space-y-4">
          <div className="h-4 bg-slate-200 rounded-full w-3/4" />
          <div className="h-4 bg-slate-200 rounded-full w-1/2" />
          <div className="h-4 bg-slate-200 rounded-full w-2/3" />
          <div className="h-4 bg-slate-200 rounded-full w-1/3" />
        </div>
        <div className="px-6 pb-6 flex justify-center">
          <div className="w-48 h-48 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Divider with circles (ticket tear line) ──────────────────────────────────

function TearLine() {
  return (
    <div className="relative flex items-center my-1">
      {/* Left notch */}
      <div className="absolute -left-7 w-6 h-6 bg-[#0A2E6E] rounded-full" />
      {/* Dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2" />
      {/* Right notch */}
      <div className="absolute -right-7 w-6 h-6 bg-[#0A2E6E] rounded-full" />
    </div>
  );
}

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className={`font-bold text-[#0A2E6E] leading-tight ${large ? 'text-xl' : 'text-sm'}`}>{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TicketCardPage() {
  const params = useParams();
  const ticketId = params?.ticketId as string;
  const user = useAuthStore((state) => state.user);

  const [ticket, setTicket] = useState<TicketCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      setLoading(false);
      setError('not-authed');
      return;
    }

    const fetchTicket = async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/card?userId=${user.id}`);
        if (res.status === 403 || res.status === 401) {
          setError('access-denied');
          return;
        }
        if (res.status === 404) {
          setError('not-found');
          return;
        }
        if (!res.ok) {
          setError('fetch-failed');
          return;
        }
        const data: TicketCardData = await res.json();
        setTicket(data);
      } catch {
        setError('fetch-failed');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [mounted, user, ticketId]);

  // ── Download (print) ────────────────────────────────────────────────────────
  const handleDownload = () => {
    window.print();
  };

  // ── Google Wallet ────────────────────────────────────────────────────────────
  const handleGoogleWallet = async () => {
    if (!user) return;
    setWalletLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/google-wallet?userId=${user.id}`);
      const data = await res.json();
      if (res.status === 501) {
        alert('Google Wallet is not configured on this server yet.');
        return;
      }
      if (!res.ok || !data.url) {
        alert('Could not generate wallet pass. Please try again.');
        return;
      }
      window.open(data.url, '_blank');
    } catch {
      alert('Could not connect to wallet service.');
    } finally {
      setWalletLoading(false);
    }
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: ticket?.order.event.title ?? 'My Ticket', url });
      } catch {
        // User cancelled share sheet — no action needed
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── Not mounted yet (SSR guard) ─────────────────────────────────────────────
  if (!mounted) return null;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A2E6E] flex items-center justify-center p-6">
        <CardSkeleton />
      </div>
    );
  }

  // ── Error states ────────────────────────────────────────────────────────────
  if (error) {
    const messages: Record<string, { heading: string; body: string }> = {
      'not-authed':    { heading: 'Sign in required', body: 'Please log in to view this ticket.' },
      'access-denied': { heading: 'Access Denied', body: 'This ticket does not belong to your account.' },
      'not-found':     { heading: 'Ticket Not Found', body: 'This ticket does not exist or has been removed.' },
      'fetch-failed':  { heading: 'Something went wrong', body: 'Could not load ticket data. Please try again.' },
    };
    const msg = messages[error] ?? messages['fetch-failed'];

    return (
      <div className="min-h-screen bg-[#0A2E6E] flex items-center justify-center p-6">
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-[#0A2E6E] mb-2">{msg.heading}</h2>
          <p className="text-slate-500 text-sm">{msg.body}</p>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const event = ticket.order.event;
  const society = event.society;
  const isVoid = ticket.isRefunded;
  const gradient = getCategoryGradient(event.category);
  const isImageUrl = event.imageUrl && !event.imageUrl.startsWith('data:');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qrCode)}`;

  return (
    <>
      {/* ── Print styles ─────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-card { box-shadow: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-[#0A2E6E] relative overflow-hidden flex flex-col items-center justify-center p-6 gap-6">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#0569b9]/20 rounded-full blur-3xl" />
        </div>

        {/* ── Ticket Card ───────────────────────────────────────────────── */}
        <div className="print-card relative w-full max-w-sm mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden z-10">

          {/* VOID watermark */}
          {isVoid && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none rotate-[-25deg]">
              <span className="text-red-600/60 text-8xl font-black tracking-widest select-none">VOID</span>
            </div>
          )}

          {/* ── TOP: Hero image / gradient banner ──────────────────────── */}
          <div className={`relative h-52 bg-gradient-to-br ${gradient} overflow-hidden`}>
            {isImageUrl && (
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover"
                sizes="448px"
              />
            )}
            {/* Overlay scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Category pill */}
            <span className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
              {event.category}
            </span>

            {/* Checked-in badge */}
            {ticket.checkedInAt && !isVoid && (
              <span className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Checked In
              </span>
            )}

            {/* Event title & society */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-white/70 text-xs font-semibold mb-1">{society.name}</p>
              <h1 className="text-white font-black text-xl leading-tight line-clamp-2">{event.title}</h1>
            </div>
          </div>

          {/* ── MIDDLE: Ticket details ─────────────────────────────────── */}
          <div className="px-6 pt-5 pb-4 space-y-4">
            {/* Date & Time — large */}
            <div className="bg-[#EFF2F7] rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0A2E6E] rounded-xl flex flex-col items-center justify-center text-white">
                <span className="text-[10px] font-bold uppercase leading-none">
                  {new Date(event.startDate).toLocaleDateString('en-IE', { month: 'short' })}
                </span>
                <span className="text-lg font-black leading-none">
                  {new Date(event.startDate).getDate()}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date &amp; Time</p>
                <p className="text-sm font-bold text-[#0A2E6E]">{formatDate(event.startDate)}</p>
                <p className="text-xs text-slate-500 font-semibold">{formatTime(event.startDate)}</p>
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <InfoRow label="Venue" value={event.location} />
              <InfoRow label="Ticket Type" value={ticket.ticketType.name} />
              <InfoRow label="Ticket Holder" value={ticket.order.user.name} />
              <InfoRow label="Price Paid" value={ticket.price === 0 ? 'Free' : `€${ticket.price.toFixed(2)}`} />
            </div>

            {/* Reference */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reference</p>
                <p className="text-sm font-black text-[#0A2E6E] tracking-widest font-mono"># {shortId(ticket.id)}</p>
              </div>
              {isVoid ? (
                <span className="text-xs font-black text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-full">REFUNDED</span>
              ) : ticket.checkedInAt ? (
                <span className="text-xs font-black text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full">USED</span>
              ) : (
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">VALID</span>
              )}
            </div>
          </div>

          {/* ── TEAR LINE ─────────────────────────────────────────────── */}
          <div className="px-6">
            <TearLine />
          </div>

          {/* ── QR CODE ───────────────────────────────────────────────── */}
          <div className="px-6 pt-5 pb-6 flex flex-col items-center gap-3">
            <div className={`relative p-3 rounded-2xl border-2 ${isVoid ? 'border-red-200 opacity-40' : 'border-slate-100'} bg-white shadow-sm`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="Ticket QR Code"
                width={180}
                height={180}
                className="rounded-xl"
              />
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
              {isVoid ? 'Ticket Void — Do Not Scan' : 'Scan at entry'}
            </p>
          </div>

          {/* ── FOOTER ────────────────────────────────────────────────── */}
          <div className="bg-[#0A2E6E] px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-white font-black text-sm tracking-tight">TCD Tickets</p>
              <p className="text-white/40 text-[10px]">Trinity College Dublin</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[10px]">Non-transferable</p>
              <p className="text-white/40 text-[10px]">Subject to terms &amp; conditions</p>
            </div>
          </div>
        </div>

        {/* ── Action buttons (hidden on print) ─────────────────────────── */}
        <div className="no-print flex flex-col items-center gap-3 z-10 w-full max-w-sm">
          {/* Row 1: Download + Share */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-[#0A2E6E] font-bold text-sm px-5 py-3 rounded-2xl shadow-lg hover:bg-slate-50 transition-all duration-200 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>

            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold text-sm px-5 py-3 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-200 active:scale-95 backdrop-blur-sm"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>

          {/* Row 2: Add to Google Wallet */}
          {!isVoid && (
            <button
              onClick={handleGoogleWallet}
              disabled={walletLoading}
              className="w-full flex items-center justify-center gap-2 bg-white text-slate-800 font-bold text-sm px-5 py-3 rounded-2xl shadow-lg hover:bg-slate-50 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {walletLoading ? (
                <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                /* Google Wallet icon */
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.5 7H2.5C1.67 7 1 7.67 1 8.5V19.5C1 20.33 1.67 21 2.5 21H21.5C22.33 21 23 20.33 23 19.5V8.5C23 7.67 22.33 7 21.5 7Z" fill="#1A73E8"/>
                  <path d="M17 7V5C17 3.9 16.1 3 15 3H9C7.9 3 7 3.9 7 5V7H9V5H15V7H17Z" fill="#1A73E8"/>
                  <circle cx="12" cy="14.5" r="2.5" fill="white"/>
                </svg>
              )}
              {walletLoading ? 'Generating pass…' : 'Add to Google Wallet'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
