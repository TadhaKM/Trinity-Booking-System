import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function calculateFees(subtotal: number): {
  bookingFee: number;
  total: number;
} {
  const bookingFee = Math.round(subtotal * 0.05 * 100) / 100; // 5% booking fee
  const total = subtotal + bookingFee;
  return { bookingFee, total };
}

export function applyCoupon(
  amount: number,
  discountPercent: number
): { discount: number; newAmount: number } {
  const discount = Math.round(amount * (discountPercent / 100) * 100) / 100;
  const newAmount = amount - discount;
  return { discount, newAmount };
}

export function generateQRCode(): string {
  return 'QR-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function isEventPast(endDate: Date | string): boolean {
  const d = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return d < new Date();
}

export function isDataUri(url: string): boolean {
  return url.startsWith('data:');
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isEventUpcoming(startDate: Date | string): boolean {
  const d = typeof startDate === 'string' ? new Date(startDate) : startDate;
  return d > new Date();
}

/**
 * Generate an ICS (iCalendar) file string for a single event.
 */
export function generateICS(event: {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
}): string {
  const fmt = (d: Date | string) => {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  const esc = (s: string) =>
    s.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TCD Tickets//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@tcd-tickets`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(event.startDate)}`,
    `DTEND:${fmt(event.endDate)}`,
    `SUMMARY:${esc(event.title)}`,
    `DESCRIPTION:${esc(event.description)}`,
    `LOCATION:${esc(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Build a Google Calendar quick-add URL.
 */
export function googleCalendarUrl(event: {
  title: string;
  description: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
}): string {
  const fmt = (d: Date | string) => {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: event.description,
    location: event.location,
    dates: `${fmt(event.startDate)}/${fmt(event.endDate)}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function getEventStatus(
  startDate: Date | string,
  endDate: Date | string
): 'upcoming' | 'ongoing' | 'past' {
  const now = new Date();
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'ongoing';
}
