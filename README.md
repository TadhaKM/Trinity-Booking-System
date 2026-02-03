# TCD Ticket Booking System

A comprehensive event ticketing platform for Trinity College Dublin societies and campus events. Built with Next.js 14, TypeScript, Prisma, PostgreSQL, and Tailwind CSS.

## Features

### Student Features
- **Event Discovery**: Browse upcoming events with filtering by category, search, and location
- **Campus World Map**: Interactive map view showing event locations across Trinity campus
- **Society Following**: Follow favorite societies to receive weekly updates
- **Ticket Booking**: Purchase tickets with multiple ticket types and coupon support
- **Digital Tickets**: QR code generation for contactless entry
- **Calendar View**: Personal calendar with event filtering options
- **Weekly Updates**: Automatic notifications for followed societies' upcoming events

### Organiser Features
- **Event Creation**: Comprehensive event creation form with multiple ticket types
- **Conflict Detection**: Real-time detection of scheduling conflicts by location
- **Dashboard Analytics**: Revenue tracking, ticket sales, and event performance metrics
- **Event Management**: View and manage all created events

### Technical Features
- **Mock Authentication**: Zustand-based authentication store (no passwords required for demo)
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Database**: PostgreSQL with Prisma ORM
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Image Optimization**: Next.js Image component for optimized loading
- **Real-time Updates**: React hooks for dynamic data fetching
- **Form Validation**: Client-side validation with error handling

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **State Management**: Zustand
- **Date Handling**: date-fns
- **QR Codes**: qrcode library
- **Utilities**: clsx, tailwind-merge

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── bookings/          # Booking creation
│   │   ├── coupons/           # Coupon validation
│   │   ├── events/            # Event CRUD and conflicts
│   │   ├── organiser/         # Organiser dashboard & societies
│   │   ├── search/            # Event search
│   │   ├── societies/         # Society details & following
│   │   └── users/             # User tickets, calendar, updates
│   ├── calendar/              # Calendar page
│   ├── campus-world/          # Interactive map view
│   ├── events/[eventId]/      # Event detail & booking
│   ├── login/                 # Mock login selector
│   ├── organiser/             # Organiser dashboard & creation
│   ├── profile/               # User profile
│   ├── search/                # Search page
│   ├── societies/[societyId]/ # Society detail page
│   ├── tickets/               # My tickets page
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── components/
│   └── Navbar.tsx             # Navigation component
├── lib/
│   ├── auth-store.ts          # Zustand auth store
│   ├── db.ts                  # Prisma client
│   ├── types.ts               # TypeScript interfaces
│   └── utils.ts               # Utility functions
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
└── Configuration files
```

## Database Schema

### Models
- **User**: Students and organisers
- **Society**: Campus societies
- **Event**: Events with location, tickets, and metadata
- **TicketType**: Multiple ticket types per event
- **Order**: Bookings with status tracking
- **Ticket**: Individual tickets with QR codes
- **Coupon**: Discount codes with expiry and usage limits
- **SocietyFollower**: User-society following relationships

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd C:\TCD-Tickets-Sys\Trinity-Booking-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/tcd_tickets?schema=public"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev --name init

   # Seed the database
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Users

The seed script creates 4 demo users:

**Students:**
- John Smith (student@tcd.ie)
- Alice Murphy (alice@tcd.ie)

**Organisers:**
- Sarah Jones (organiser@tcd.ie)
- Bob O'Brien (bob@tcd.ie)

Select any user on the login page to access the system.

## Default Coupons

- **WELCOME2026**: 20% off, expires 2026-12-31
- **STUDENT50**: 50% off, expires 2026-06-30
- **EARLYBIRD**: 15% off, expires 2026-03-01

## Key Workflows

### Booking a Ticket
1. Browse events on home page or via search
2. Click on an event to view details
3. Select ticket quantities
4. Click "Book Tickets"
5. Apply coupon code (optional)
6. Complete booking
7. View tickets in "My Tickets" with QR codes

### Following a Society
1. Navigate to a society page
2. Click "Follow" button
3. View weekly updates on home page
4. See followed society events in calendar

### Creating an Event (Organiser)
1. Login as an organiser
2. Navigate to "Organiser Dashboard"
3. Click "Create Event"
4. Fill in event details
5. Add ticket types
6. System checks for location conflicts
7. Submit event
8. View analytics on dashboard

## API Routes

### Public Routes
- `GET /api/users` - List all users
- `GET /api/events` - List all upcoming events
- `GET /api/events/:id` - Get event details
- `GET /api/societies/:id` - Get society details
- `POST /api/search` - Search events
- `POST /api/coupons/validate` - Validate coupon code

### User Routes (require authentication)
- `GET /api/users/:id/tickets` - Get user's tickets
- `GET /api/users/:id/calendar-events` - Get calendar events
- `GET /api/users/:id/weekly-updates` - Get weekly updates
- `GET /api/users/:id/followed-societies` - Get followed societies
- `POST /api/societies/:id/follow` - Follow/unfollow society
- `POST /api/bookings/create` - Create booking

### Organiser Routes
- `GET /api/organiser/:id/dashboard` - Get dashboard stats
- `GET /api/organiser/:id/societies` - Get societies
- `POST /api/events/create` - Create event
- `POST /api/events/conflicts` - Check for conflicts

## Features in Detail

### Event Discovery
- Multiple view modes: List, Map (Campus World), Calendar
- Category filtering: Arts & Culture, Music, Academic, Sports & Fitness, etc.
- Full-text search across titles, descriptions, locations, and tags
- Society-based filtering

### Booking System
- Multiple ticket types per event
- Real-time availability checking
- Coupon code support with validation
- 5% booking fee calculation
- QR code generation for digital tickets
- Order confirmation with status tracking

### Organiser Dashboard
- Total revenue tracking
- Ticket sales analytics
- Event performance metrics (fill rate)
- Upcoming vs. total events count
- Per-event breakdown with visual indicators

### Conflict Detection
- Real-time checking during event creation
- Location-based conflict detection
- Time overlap validation
- Visual warnings for organisers

## Development

### Database Management
```bash
# View database in Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (warning: deletes all data)
npx prisma migrate reset

# Format schema
npx prisma format
```

### Building for Production
```bash
npm run build
npm start
```

## Future Enhancements

- Real authentication with email/password
- Payment gateway integration (Stripe)
- Email notifications for bookings and updates
- Event recommendations based on preferences
- Advanced analytics for organisers
- Mobile app (React Native)
- Push notifications
- Social sharing features
- Event reviews and ratings
- Waitlist functionality for sold-out events
- Refund processing
- Multi-day event support
- Recurring events

## Contributing

This is a demonstration project for the TCD Ticket Booking System.

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please contact the development team.

## Acknowledgments

- Trinity College Dublin
- Unsplash for event images
- Next.js team for the amazing framework
- Prisma team for the excellent ORM
