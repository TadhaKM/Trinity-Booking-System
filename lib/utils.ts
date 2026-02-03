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

export function isEventUpcoming(startDate: Date | string): boolean {
  const d = typeof startDate === 'string' ? new Date(startDate) : startDate;
  return d > new Date();
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
