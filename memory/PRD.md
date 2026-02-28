# TCD Ticket Booking System - PRD

## Original Problem Statement
Make the Landing page look a lot nicer and professional, keep all features already there but make it look better. User says it feels boring. User wants: keep current color theme, AI decides design style, go all out with impressive animations.

## Architecture
- **Stack**: Next.js (App Router), Prisma ORM, Tailwind CSS, Turso/LibSQL
- **Pages**: Home, Campus World, Search, Calendar, Login, Signup, Profile, Tickets, Organiser, Admin, Events, Societies
- **Auth**: Custom auth via Zustand store

## What's Been Implemented (Jan 28, 2026)

### Login & Signup Page Redesign
- **Split-screen layout**: Left panel with animated gradient (blue-to-teal), floating blobs, TCD branding, tagline, and campus imagery; Right panel with form card
- **Icon-adorned inputs**: Envelope for email, lock for password, user for name, shield for confirm password
- **Enhanced interactions**: Smooth hover/focus transitions, password visibility toggle with hover states, animated entrance
- **Login left panel**: "Welcome back to campus life." tagline + floating campus image card with "Live events happening now"
- **Signup left panel**: "Join the Trinity community." tagline + feature list (Book tickets instantly, Connect with 50+ societies, Never miss campus events)
- **Preserved all functionality**: Validation, role selection, password strength indicator, caps lock detection, remember me

### Landing Page Redesign - "Electric Academia" Theme
- **Floating Glassmorphic Navbar**: Detached pill-shaped nav with backdrop blur, scroll-aware transparency
- **Split Hero Layout**: Massive typography left column + floating image with accent cards right column
- **Animated Background**: Three animated gradient blobs (float, float-delayed) creating depth
- **Staggered Entrance Animations**: All sections animate in with CSS transitions on mount
- **Enhanced Category Cards**: Gradient cards with hover shine, scale, and rotation micro-interactions
- **Bento Grid Events**: First event spans 8 cols (featured), second spans 4 cols (tall), rest 4 cols each
- **CTA Section**: Gradient animated background with noise overlay for logged-out users
- **Stats Row**: Events, Societies, Students counters in hero
- **Button Shine Effect**: Pill buttons with sliding shimmer on hover
- **Card Shine Effect**: CSS-only shine sweep on event cards

### Files Modified
- `tailwind.config.ts` - Added animation keyframes (float, slide-up, scale-in, shimmer, gradient-shift)
- `app/globals.css` - Glassmorphism, gradient text, card shine, noise overlay, category hover, nav glass utilities
- `components/Navbar.tsx` - Complete redesign to floating pill with mobile hamburger menu
- `app/page.tsx` - Complete redesign with split hero, bento grid, staggered animations

## Prioritized Backlog
- P0: None (landing page redesign complete)
- P1: Add events to database to see full bento grid in action
- P2: Enhance other pages (search, calendar, profile) with similar design language
- P2: Add page transition animations between routes

## Next Tasks
- User review of landing page redesign
- Consider extending design system to other pages
- Add skeleton loading states for events
