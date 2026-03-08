'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import QRScanner from '@/components/QRScanner';
import type { Event } from '@/lib/types';

type ScanResult = {
  type: 'success' | 'already' | 'invalid' | 'error';
  message: string;
  ticketTypeName?: string;
};

export default function CheckInPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState<{ checkedIn: number; total: number } | null>(null);

  useEffect(() => {
    if (!user?.isOrganiser) { router.replace('/'); return; }
    fetch(`/api/organiser/${user.id}/analytics`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.events)) setEvents(data.events);
      })
      .catch(() => {});
  }, [user, router]);

  useEffect(() => {
    if (!selectedEventId || !user) return;
    // Fetch current check-in stats
    fetch(`/api/organiser/${user.id}/analytics`)
      .then((r) => r.json())
      .then((data) => {
        const ev = data.events?.find((e: any) => e.id === selectedEventId);
        if (ev) setStats({ checkedIn: ev.checkedIn ?? 0, total: ev.soldTickets ?? 0 });
      })
      .catch(() => {});
  }, [selectedEventId, user, result]);

  const handleScan = async (qrCode: string) => {
    if (verifying || !selectedEventId || !user) return;
    setVerifying(true);
    setResult(null);

    try {
      // Step 1: Verify
      const verifyRes = await fetch('/api/checkin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode, eventId: selectedEventId, organiserId: user.id }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setResult({ type: 'error', message: verifyData.error ?? 'Verification failed' });
        return;
      }

      if (!verifyData.valid) {
        if (verifyData.reason === 'Already checked in') {
          setResult({ type: 'already', message: 'Already checked in' });
        } else {
          setResult({ type: 'invalid', message: verifyData.reason ?? 'Invalid ticket' });
        }
        return;
      }

      // Step 2: Confirm
      const confirmRes = await fetch('/api/checkin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode, eventId: selectedEventId, organiserId: user.id }),
      });
      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        setResult({ type: 'error', message: confirmData.error ?? 'Check-in failed' });
        return;
      }

      setResult({
        type: 'success',
        message: 'Checked in!',
        ticketTypeName: verifyData.ticket?.ticketTypeName,
      });
    } catch {
      setResult({ type: 'error', message: 'Network error — try again' });
    } finally {
      setVerifying(false);
    }
  };

  if (!user?.isOrganiser) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg className="w-5 h-5 text-[#0A2E6E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A2E6E]">Check-In Scanner</h1>
          <p className="text-sm text-gray-500">Scan tickets at the door</p>
        </div>
      </div>

      {/* Event Selector */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Select Event</label>
        <select
          value={selectedEventId}
          onChange={(e) => { setSelectedEventId(e.target.value); setResult(null); setScanning(false); }}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-[#0A2E6E] font-medium focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
        >
          <option value="">— Choose an event —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>

        {stats && (
          <div className="mt-3 flex gap-4">
            <div className="flex-1 bg-[#EFF2F7] rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-[#0569b9]">{stats.checkedIn}</p>
              <p className="text-xs text-gray-500 mt-0.5">Checked in</p>
            </div>
            <div className="flex-1 bg-[#EFF2F7] rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-[#0A2E6E]">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total sold</p>
            </div>
            <div className="flex-1 bg-[#EFF2F7] rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-[#0A2E6E]">
                {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Attendance</p>
            </div>
          </div>
        )}
      </div>

      {/* Scanner */}
      {selectedEventId && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[#0A2E6E] text-sm">Camera</p>
            <button
              onClick={() => { setScanning((s) => !s); setResult(null); }}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition ${
                scanning
                  ? 'bg-red-50 text-red-500 hover:bg-red-100'
                  : 'bg-[#EFF2F7] text-[#0569b9] hover:bg-gray-200'
              }`}
            >
              {scanning ? 'Stop' : 'Start Scanning'}
            </button>
          </div>

          {scanning && (
            <QRScanner onScan={handleScan} active={scanning} />
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${
              result.type === 'success' ? 'bg-green-50 border border-green-200' :
              result.type === 'already' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                result.type === 'success' ? 'bg-green-100' :
                result.type === 'already' ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                {result.type === 'success' ? '✓' : result.type === 'already' ? '!' : '✗'}
              </div>
              <div>
                <p className={`font-bold text-sm ${
                  result.type === 'success' ? 'text-green-700' :
                  result.type === 'already' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {result.message}
                </p>
                {result.ticketTypeName && (
                  <p className="text-xs text-green-600 mt-0.5">{result.ticketTypeName}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
