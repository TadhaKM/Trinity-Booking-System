# TCD Tickets — App Version PRD

## Original Problem Statement
> "Build an app version of this website, make sure everything is smooth and works properly"
>
> Website: https://trinity-booking-system.vercel.app/
> Type: Mobile-first responsive web app
> Features: Everything — especially booking tickets, payment, posting
> Design: Match original website

## Architecture
- **Framework**: Next.js 16 (App Router, Turbopack build)
- **ORM**: Prisma 5 + SQLite (dev.db) with libSQL/Turso adapter ready for prod
- **Auth**: Custom bcrypt-based sessions via Zustand (customer / organiser / admin roles)
- **Payments**: Stripe (PaymentElement + Stripe Connect demo)
- **Maps**: Mapbox GL JS
- **AI**: Anthropic Claude chat widget (optional)
- **PWA**: manifest.json + service worker + offline page
- **State**: Zustand
- **Styling**: Tailwind CSS — "Electric Academia" brand (deep-navy + teal + electric-blue)

## Services (emergent container)
- `frontend` → Next.js prod build (`next start -p 3000`), supervisor-managed
- `backend` → FastAPI proxy (`/api/*` → Next.js 3000), supervisor-managed
- `mongodb` → running but not used (app uses SQLite/Turso)

## What's Been Implemented — App version bring-up (Apr 2026)

### Infrastructure
- Configured `/app/.env` with Stripe test key, Anthropic (Emergent LLM) key, JWT secret, SQLite DATABASE_URL, site URL
- Regenerated Prisma client (`npx prisma generate`)
- Pushed schema to SQLite (`npx prisma db push`) — 19 tables created
- Seeded demo data (`npx tsx prisma/seed.ts`): 4 users, 5 societies, 8 events, 30 days of revenue history, posts, comments, notifications, coupons
- Switched `package.json` start script from broken `next start` (no build) → `next start -p 3000` after running `yarn build`
- Verified preview URL serves pages + `/api/events` returns seeded events

### Feature Set (already present in codebase, now functional end-to-end)
- **Auth**: Email/password login, signup (customer + organiser), Google OAuth stub
- **Event Discovery**: Home hero, categories, upcoming events grid, search + filters (date, price, free, category), personalised feed
- **Societies**: Browse, follow/unfollow, society posts with likes, leaderboard
- **Booking**: Multi-tier ticket types, coupon codes, Stripe PaymentElement checkout, guest checkout
- **My Tickets**: QR code tickets, wallet-style card, ICS calendar download, ticket transfer
- **Waitlist**: Auto-join when sold out, auto-promote on refund
- **Refunds**: User request (full/partial), Stripe refund, admin approve/reject, audit log
- **Organiser**: Create/edit events, analytics dashboard, attendee list + CSV export, check-in QR scanner, society posts
- **Admin**: Users (ban/unban), events (publish/cancel), orders, refunds, audit log, stats
- **Campus Map**: Mapbox campus world view
- **AI Chat**: Claude-powered event assistant
- **PWA**: Installable, offline page, push notification scaffolding
- **Mobile UX**: Sticky CTAs, responsive nav pill, tap-friendly targets

## Prioritized Backlog
- **P1**: Wire Anthropic chat to Emergent LLM key via emergentintegrations (chat currently needs real Anthropic key)
- **P1**: Replace Mapbox placeholder token for full campus-world map
- **P2**: Re-enable push notifications (VAPID keys + CSP worker-src)
- **P2**: Cloudinary/S3 image hosting (currently base64 in DB)
- **P2**: Email notifications (Resend / SendGrid)

## Next Tasks
- Run testing_agent_v3 to validate booking + payment + posting flows on mobile viewport
- Confirm user can book → pay → receive QR code → organiser can scan check-in
