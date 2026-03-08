'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import type { Notification } from '@/lib/types';

const POLL_INTERVAL = 30_000; // 30 seconds

export default function NotificationBell() {
  const user = useAuthStore((s: any) => s.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent — notification fetch failures must not break the UI
    }
  }, [user]);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAllRead = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    if (!user) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-[#0A2E6E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-[#0A2E6E] text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs text-[#0569b9] hover:text-[#0A2E6E] font-medium transition-colors disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={markRead} onClose={() => setOpen(false)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  onRead,
  onClose,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const handleClick = () => {
    if (!n.read) onRead(n.id);
    onClose();
  };

  const timeAgo = formatTimeAgo(new Date(n.createdAt));
  const icon = notificationIcon(n.type);

  const inner = (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/60' : ''}`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#EFF2F7] flex items-center justify-center text-base">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold text-[#0A2E6E] leading-tight ${!n.read ? 'font-bold' : ''}`}>
          {n.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-[10px] text-gray-400 mt-1">{timeAgo}</p>
      </div>
      {!n.read && <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#0569b9] mt-1" />}
    </div>
  );

  if (n.link) {
    return <Link href={n.link}>{inner}</Link>;
  }
  return inner;
}

function notificationIcon(type: string): string {
  switch (type) {
    case 'BOOKING_CONFIRMED': return '🎟️';
    case 'TICKET_RECEIVED': return '📨';
    case 'EVENT_REMINDER': return '⏰';
    case 'NEW_EVENT': return '🎉';
    case 'EVENT_UPDATED': return '📝';
    case 'EVENT_CANCELLED': return '❌';
    case 'WAITLIST_PROMOTED': return '🚀';
    case 'LOW_AVAILABILITY': return '⚠️';
    default: return '🔔';
  }
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
