export interface Society {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  location: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  available: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  societyId: string;
  society?: Society;
  startDate: Date;
  endDate: Date;
  location: string;
  locationCoords: {
    lat: number;
    lng: number;
  };
  category: string;
  imageUrl: string;
  tags: string[];
  ticketTypes: TicketType[];
  organiserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketType?: TicketType;
  price: number;
  qrCode: string;
  isRefunded?: boolean;
  refundedAt?: string | null;
  createdAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  event?: Event;
  tickets: Ticket[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isOrganiser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
  createdAt: Date;
}

export interface SocietyFollower {
  id: string;
  userId: string;
  societyId: string;
  createdAt: Date;
}

export interface BookingFormData {
  ticketSelections: {
    ticketTypeId: string;
    quantity: number;
  }[];
  couponCode?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  societyName: string;
  location: string;
}

export interface WeeklyUpdate {
  societyId: string;
  societyName: string;
  events: Event[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: Date;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  ticketTypeId: string;
  eventId: string;
  position: number;
  notified: boolean;
  createdAt: Date;
}

export interface SavedEvent {
  id: string;
  userId: string;
  eventId: string;
  event?: Event;
  createdAt: Date;
}

export interface CheckInLog {
  id: string;
  ticketId: string;
  eventId: string;
  scannedBy: string;
  scannedAt: Date;
}

export type SortOption = 'date' | 'price-asc' | 'price-desc' | 'popular' | 'newest';
export type FilterOption = 'all' | 'today' | 'this-week' | 'free';
