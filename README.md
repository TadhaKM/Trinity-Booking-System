# TCD Tickets

> **A full-stack event ticketing platform built for Trinity College Dublin societies and clubs.**

TCD Tickets is a production-quality Next.js application covering the complete lifecycle of university event management: discovery, booking, payment, check-in, organiser analytics, and admin governance.

---

## Table of Contents

- [Feature Set](#feature-set)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Challenges & Decisions](#challenges--decisions)
- [Roadmap](#roadmap)

---

## Feature Set

### Phase 1 — Core Platform

| Feature | Details |
|---------|---------|
| **Authentication** | Email/password with bcrypt hashing; role-based (customer / organiser / admin); Google OAuth stub ready for credentials |
| **Event Discovery** | Category browse, full-text search, filters (date, price, free, category), sort, personalised feed |
| **Booking & Payment** | Stripe PaymentElement (card, Apple Pay, Google Pay); coupon codes; guest checkout |
| **My Tickets** | QR-code tickets; ICS calendar download; ticket transfer to other users |
| **Societies** | Follow/unfollow; society posts with likes; society-specific event feeds |
| **Saved Events** | Bookmark events; saved events feed |
| **Waitlist** | Auto-join when sold out; automatic promotion on cancellation/refund |
| **Notifications** | In-app notification bell with 30s polling; mark read / mark all read |
| **Organiser Dashboard** | Event management; revenue & analytics charts; post creation; check-in scanner |
| **Admin Panel** | User/event/order/coupon management; platform stats |
| **Campus Map** | Mapbox GL JS interactive campus map with event markers |
| **AI Chat** | Claude-powered event assistant with tool-call integration |

### Phase 2 — Production Maturity

| Feature | Details |
|---------|---------|
| **Public SEO** | `generateMetadata` server-side for every event page; Open Graph / Twitter Card; canonical URLs |
| **Social Sharing** | Copy link, Twitter/X, WhatsApp, LinkedIn share buttons on event pages |
| **Refund System** | Full and partial (single-ticket) refund requests; Stripe refund integration; admin approve/reject workflow; ticket invalidation; user notifications |
| **Admin Moderation** | Ban/unban users; publish/unpublish/cancel events; full audit log; refund management tab; all in-app |
| **Audit Log** | Every sensitive admin action recorded with actor, entity, and JSON detail payload |
| **Venue Capacity** | Optional per-event capacity; server-side enforcement prevents overselling; occupancy % shown on event page |
| **Advanced Search** | Price range, date range, society, tag, and keyword filters; typeahead suggestions; URL-synced state |
| **Attendee List** | Per-event attendee table with search/filter; CSV export with one click |
| **Event Comments / Q&A** | Threaded comments on event pages; organiser can hide/reply; rate-limited; HTML sanitized |
| **Event Image Gallery** | Multiple images per event; responsive grid + fullscreen lightbox with keyboard navigation |
| **Society Leaderboards** | "Most Followed" and "Top This Month" sections on Societies page |
| **Recommendations** | Personalised events from followed societies, category affinity, trending this week, and similar events |
| **Digital Ticket Card** | Wallet-style ticket page at `/tickets/[id]/card` with QR code; printable; Web Share API |
| **PWA** | `manifest.json`, service worker (cache-first static, network-first API, offline page), push notification scaffolding |
| **Push Notifications** | Web Push subscription API; SW push event handler; architecture in place for delivery service |
| **Mobile UX** | Improved tap targets, sticky CTAs, responsive table scrolling on attendee/admin pages |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Turso (remote libSQL/SQLite) via Prisma + adapter |
| ORM | Prisma 5 |
| Auth | Custom sessions via Zustand + bcryptjs |
| Payments | Stripe (PaymentElement, Stripe Connect, Stripe Refunds) |
| Maps | Mapbox GL JS |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| State | Zustand |
| Testing | Jest 30 + React Testing Library |
| Fonts | Manrope (Google Fonts) |

---

## Architecture Overview

```
app/
├── events/[eventId]/
│   ├── layout.tsx    # Server component: generateMetadata (SEO + OG)
│   └── page.tsx      # Client component: interactive event page
├── organiser/
│   ├── dashboard/    # Analytics, posts, check-in button
│   ├── create-event/ # Event creation with venue capacity
│   ├── edit-event/
│   ├── checkin/      # QR scanner + verify/confirm flow
│   └── attendees/[eventId]/ # Attendee list + CSV export
├── admin/            # Full moderation dashboard (6 tabs)
├── tickets/
│   └── [ticketId]/card/ # Digital wallet-style ticket
└── offline/          # PWA offline fallback page

app/api/
├── events/[eventId]/comments/  # Threaded comments
├── refunds/                    # Refund request + admin review
├── admin/
│   ├── users/[userId]/ban/     # Ban/unban
│   ├── audit-log/              # Audit trail
│   ├── refunds/                # Admin refund queue
│   └── events/[id]/moderate/  # Publish/cancel
├── push/                       # Web Push subscribe/unsubscribe
├── recommendations/            # Personalised event feed
├── societies/leaderboard/      # Society rankings
└── tickets/[ticketId]/card/   # Wallet card data

lib/
├── refund.ts         # Stripe refund + ticket invalidation
├── audit.ts          # Fire-and-forget audit log
├── recommendations.ts # Heuristic recommendation engine
├── csv-export.ts     # Pure CSV generation utilities
└── sanitize.ts       # Server-side HTML stripping (XSS)

public/
├── manifest.json     # PWA manifest
└── sw.js             # Service worker
```

### Key Design Decisions

**Rate limiting is in-memory** — A `Map`-based sliding window handles all rate limiting. For distributed deployments, replace with Redis/Upstash. The `rateLimit()` interface is identical so swapping is a 1-line change per route.

**Next.js 16 async params** — All route handlers type params as `Promise<{...}>` and `await` them. Using the old synchronous pattern silently breaks all API routes at build time.

**Notifications are fire-and-forget** — `createNotification()` never throws. Booking/refund flows never fail due to a notification write error.

**Recommendations use transparent heuristics** — No ML. Three strategies: followed-society events, category affinity from history, trending by saves+orders. Simple integer scores, easy to tune.

**SEO via layout-level server components** — Event `page.tsx` is `'use client'` for interactivity. A sibling `layout.tsx` exports `generateMetadata()` server-side, keeping the pattern clean.

**CSV export is pure functions** — `lib/csv-export.ts` has zero I/O, making it trivially testable.

**Refunds require payment intent ID** — `Order.stripePaymentIntentId` must be populated during booking for Stripe refunds to work. New bookings save this field automatically.

---

## Getting Started

```bash
# 1. Clone and install
git clone <repo-url>
cd Trinity-Booking-System
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — see Environment Variables section

# 3. Push schema to local SQLite
npx prisma db push

# 4. (Optional) Seed demo data
npx tsx prisma/seed.ts

# 5. Start dev server
npm run dev
```

---

## Environment Variables

```env
# Database — leave empty to use local SQLite (dev.db)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=YOUR_MAPS_KEY

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# Anthropic (AI chat)
ANTHROPIC_API_KEY=sk-ant-...

# App URL (used for OG canonical URLs)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# Web Push VAPID keys (generate: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

---

## Database Schema

| Model | Purpose |
|-------|---------|
| `User` | Auth, roles (`isOrganiser`, `isAdmin`, `isBanned`) |
| `Society` | TCD societies with followers and posts |
| `Event` | Events with `venueCapacity`, `galleryImages`, comments, `isCancelled` |
| `TicketType` | Ticket tiers per event |
| `Order` | Booking record with `stripePaymentIntentId` |
| `Ticket` | Individual ticket with QR code, check-in, `isRefunded` state |
| `RefundRequest` | Full or partial refund with Stripe refund ID |
| `EventComment` | Threaded comments (1 level deep) |
| `AuditLog` | Admin action trail (actor, action, entity, details JSON) |
| `PushSubscription` | Web Push endpoint + keys |
| `Notification` | In-app notifications |
| `WaitlistEntry` | Per-ticket-type waitlist with position |
| `SavedEvent` | User bookmarks |
| `CheckInLog` | Door scan records |

```bash
# After schema changes:
npx prisma db push       # sync to DB
npx prisma generate      # regenerate client (restart dev server after)
```

---

## API Reference

### Events
```
GET    /api/events                          List/search events
POST   /api/events/create                   Create (organiser)
GET    /api/events/[id]                     Get event detail
PUT    /api/events/[id]                     Update (organiser)
DELETE /api/events/[id]                     Delete (organiser/admin)
GET    /api/events/[id]/calendar            Download .ics
GET/POST/DELETE /api/events/[id]/save       Save/unsave/check
GET/POST /api/events/[id]/comments          List/post comments
PATCH/DELETE /api/events/[id]/comments/[c]  Moderate/edit/delete
```

### Bookings & Tickets
```
POST   /api/bookings/create                 Book event
POST   /api/bookings/guest                  Guest checkout
GET    /api/users/[userId]/tickets          My tickets
POST   /api/tickets/[id]/transfer           Transfer ticket
GET    /api/tickets/[id]/card               Wallet card data
```

### Refunds
```
POST   /api/refunds                         Request refund
GET    /api/refunds?userId=                 My requests
GET    /api/refunds/[id]                    Single request
PATCH  /api/refunds/[id]                    Approve/reject (admin)
GET    /api/admin/refunds?adminId=          All requests (admin)
```

### Admin
```
GET/POST  /api/admin/users                  List / manage users
POST      /api/admin/users/[id]/ban         Ban user
DELETE    /api/admin/users/[id]/ban         Unban user
GET       /api/admin/audit-log              Audit trail
PATCH     /api/admin/events/[id]/moderate   Publish/cancel event
GET       /api/admin/stats                  Platform stats
```

### Discovery
```
GET    /api/recommendations                 Personalised events
GET    /api/societies/leaderboard           Society rankings
POST   /api/checkin/verify                  Validate QR scan
POST   /api/checkin/confirm                 Record check-in
GET    /api/organiser/[id]/events/[e]/attendees  Attendee list + CSV
```

---

## Testing

```bash
npm test                        # all tests
npx jest __tests__/phase2       # Phase 2 tests only
npx jest --coverage             # with coverage report
```

**Test coverage:**
- `phase2/refund.test.ts` — CSV generation, HTML sanitization, refund schemas
- `phase2/venue-capacity.test.ts` — Venue capacity schema edge cases
- `phase2/comments.test.ts` — Comment schemas, XSS sanitization
- `phase2/admin.test.ts` — Admin schemas, audit log fire-and-forget
- `phase2/recommendations.test.ts` — Push subscription schema, CSV edge cases
- `navbar.test.tsx`, `search.test.tsx`, `login.test.tsx`, `societies.test.tsx`, `stripe.test.ts`

---

## Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

**Checklist:**
- [ ] `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- [ ] Stripe production keys
- [ ] `NEXT_PUBLIC_SITE_URL` = production domain
- [ ] VAPID keys for push notifications
- [ ] Google OAuth credentials
- [ ] Generate PWA icons: `public/icons/icon-{72,96,128,144,152,192,384,512}.png`
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` for campus map

**Service worker note:** Only registered in `production` mode. During `npm run dev` it is disabled to prevent stale-cache issues.

---

## Challenges & Decisions

**Next.js 16 async params** — Using synchronous `{ params: { id: string } }` causes a silent TypeScript build error that returns HTML 500 for all API routes. Every route in this project uses `{ params: Promise<{ id: string }> }` with `await`.

**Prisma + Turso** — `npx prisma db push` only updates the local `dev.db`. For Turso, use the Turso CLI or `@libsql/client` migrations. `lib/db.ts` auto-selects based on env vars.

**Rate limiting per-process** — Works for single-process Node.js. For Vercel/serverless (multiple instances), upgrade the `Map` in `lib/rate-limit.ts` to Upstash Redis — the interface is identical.

**Image storage as base64** — Works for demo; not suitable for high-traffic production. Upgrade: use Cloudinary or S3, store URL only. The `ImageUpload` component enforces 2MB client-side; server accepts up to 10MB.

**Stripe refunds need payment intent ID** — `Order.stripePaymentIntentId` must be saved during booking. New bookings do this automatically. For existing orders without the field, a migration script is needed.

**PWA icons not included** — Generate from your logo with [PWABuilder](https://www.pwabuilder.com/) and place in `public/icons/`.

---

## Roadmap

- [ ] Real-time notifications (SSE or WebSockets)
- [ ] Apple Wallet `.pkpass` (requires Apple Developer Program certificate)
- [ ] Event series / recurrence
- [ ] Email notifications (Resend integration)
- [ ] Full-text search with Turso FTS5 extension
- [ ] Organiser payout dashboard with Stripe Connect Express
- [ ] WCAG 2.1 AA accessibility audit
- [ ] Internationalisation (Irish language)

---

*Built with Next.js 16, Prisma, Turso, Stripe, Mapbox, and Anthropic Claude.*
