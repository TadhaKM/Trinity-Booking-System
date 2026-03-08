/**
 * Centralised Zod schemas for all API routes.
 *
 * Using schemas here (rather than ad-hoc validation per route) ensures:
 *  - Consistent field limits, types and error messages
 *  - Easy auditing of what data each endpoint accepts
 *  - Protection against mass-assignment / unexpected-field attacks
 *
 * OWASP references: A03 Injection, A05 Security Misconfiguration
 */

import { z } from 'zod';

// ─── Reusable primitives ──────────────────────────────────────────────────────

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email is required')
  .max(255, 'Email is too long')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

const nonEmptyString = (label: string, max = 1000) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const cuid = z.string().trim().min(1).max(50);

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

export const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email,
  password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['organiser', 'customer']).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ─── Event schemas ────────────────────────────────────────────────────────────

const TicketTypeSchema = z.object({
  id: z.string().max(50).optional(),
  name: nonEmptyString('Ticket name', 100),
  price: z.number().min(0, 'Price cannot be negative').max(10_000, 'Price is too high'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100_000),
});

export const CreateEventSchema = z.object({
  title: nonEmptyString('Title', 200),
  description: nonEmptyString('Description', 5000),
  societyId: nonEmptyString('Society', 300),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  location: nonEmptyString('Location', 300),
  category: z.string().trim().max(100).optional(),
  imageUrl: z.string().max(8_000_000).optional(), // allow base64 data URIs (~6MB image)
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  ticketTypes: z
    .array(TicketTypeSchema)
    .min(1, 'At least one ticket type is required')
    .max(20, 'Too many ticket types'),
  organiserId: cuid,
  venueCapacity: z.number().int().min(1).max(100_000).optional().nullable(),
});

export const UpdateEventSchema = CreateEventSchema.extend({
  organiserId: cuid,
}).partial({ startDate: true, location: true, ticketTypes: true });

// ─── Booking schema ───────────────────────────────────────────────────────────

export const CreateBookingSchema = z.object({
  userId: cuid,
  eventId: cuid,
  ticketSelections: z
    .array(
      z.object({
        ticketTypeId: cuid,
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1, 'Please select at least one ticket')
    .max(10, 'Too many ticket types selected'),
  couponCode: z.string().trim().max(50).optional(),
});

// ─── Search schema ────────────────────────────────────────────────────────────

export const SearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
});

// ─── Chat schema ──────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

export const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1, 'Messages are required')
    .max(100, 'Conversation too long'),
  userId: z.string().max(50).optional(),
});

// ─── Admin schemas ────────────────────────────────────────────────────────────

export const AdminActionSchema = z.object({
  adminId: cuid,
  action: z.enum(['list', 'delete', 'toggleOrganiser']),
  targetUserId: z.string().max(50).optional(),
});

export const AdminOrderPatchSchema = z.object({
  adminId: cuid,
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
});

export const AdminOrderDeleteSchema = z.object({
  adminId: cuid,
});

// ─── Society post schemas ─────────────────────────────────────────────────────

export const CreatePostSchema = z.object({
  organiserId: cuid,
  imageUrl: z.string().min(1, 'Image is required').max(5_000_000, 'Image too large'),
  caption: z.string().trim().min(1, 'Caption is required').max(500, 'Caption is too long'),
  eventId: z.string().max(50).optional(),
});

export const PinPostSchema = z.object({
  organiserId: cuid,
  isPinned: z.boolean(),
});

export const LikePostSchema = z.object({
  userId: cuid,
});

// ─── Refund schemas ───────────────────────────────────────────────────────────

export const CreateRefundRequestSchema = z.object({
  userId: cuid,
  orderId: cuid,
  ticketId: cuid.optional(), // omit for full-order refund
  reason: z.string().trim().min(10, 'Please provide a reason (at least 10 characters)').max(500),
});

export const ReviewRefundSchema = z.object({
  adminId: cuid,
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNote: z.string().trim().max(500).optional(),
});

// ─── Comment schemas ──────────────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  userId: cuid,
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
  parentId: cuid.optional(),
});

export const UpdateCommentSchema = z.object({
  userId: cuid,
  isHidden: z.boolean().optional(),
  body: z.string().trim().min(1).max(2000).optional(),
});

// ─── Venue capacity schema ────────────────────────────────────────────────────

export const VenueCapacitySchema = z.object({
  venueCapacity: z.number().int().min(1).max(100_000).optional().nullable(),
});

// ─── Push subscription schema ─────────────────────────────────────────────────

export const PushSubscribeSchema = z.object({
  userId: cuid,
  endpoint: z.string().min(1).max(2048).regex(/^https:\/\//, 'Endpoint must be an HTTPS URL'),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(100),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Returns a flat human-readable list of Zod errors.
 * Used to surface validation problems to API callers.
 */
export function zodErrors(result: z.ZodSafeParseError<any>): string {
  return result.error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
    .join('; ');
}
