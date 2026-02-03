# Quick Start Guide

Get the TCD Ticket Booking System up and running in 5 minutes!

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database running
- Basic terminal knowledge

## Installation Steps

### 1. Install Dependencies

```bash
cd C:\TCD-Tickets-Sys\Trinity-Booking-System
npm install
```

### 2. Configure Database

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/tcd_tickets?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# Seed with sample data
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Open the App

Navigate to [http://localhost:3000](http://localhost:3000)

## First Steps

### Login as a Student

1. Click "Login" in the navigation bar
2. Select "John Smith" or "Alice Murphy"
3. Explore events, follow societies, and book tickets

### Login as an Organiser

1. Click "Login" in the navigation bar
2. Select "Sarah Jones" or "Bob O'Brien"
3. Access the Organiser Dashboard
4. Create your first event

## Test the System

### Book a Ticket

1. Go to Home → Browse events
2. Click on "Waiting for Godot"
3. Select 2 Student tickets
4. Click "Book 2 Tickets"
5. Apply coupon code: `STUDENT50`
6. Complete booking
7. Navigate to "My Tickets" to view QR codes

### Follow a Society

1. Click on any event
2. Click the society name (e.g., "DU Players")
3. Click "Follow" button
4. Return to Home page
5. See "Your Weekly Updates" section

### Create an Event (as Organiser)

1. Login as an organiser
2. Go to "Organiser Dashboard"
3. Click "Create Event"
4. Fill in:
   - Title: "Spring Concert"
   - Society: "Celtic Music Society"
   - Date: Tomorrow's date
   - Location: "Exam Hall"
5. Add ticket type: General Admission, €10, 100 tickets
6. Submit
7. View analytics on dashboard

### Use Campus World

1. Navigate to "Campus World"
2. Click on event markers on the map
3. View event details in sidebar
4. Click "View Event Details" to book

## Default Accounts

**Students (No special permissions):**
- student@tcd.ie (John Smith)
- alice@tcd.ie (Alice Murphy)

**Organisers (Can create events):**
- organiser@tcd.ie (Sarah Jones)
- bob@tcd.ie (Bob O'Brien)

## Default Coupon Codes

Try these coupon codes when booking:
- `WELCOME2026` - 20% discount
- `STUDENT50` - 50% discount
- `EARLYBIRD` - 15% discount

## Sample Data Included

The seed script creates:
- **6 Societies**: DU Players, Computer Science Society, Celtic Music Society, etc.
- **12 Events**: Theatre shows, hackathons, concerts, debates, and more
- **4 Users**: 2 students + 2 organisers
- **3 Coupon codes**: Active discount codes

## Common Commands

```bash
# Start development server
npm run dev

# View database in browser
npx prisma studio

# Reset database (deletes all data)
npx prisma migrate reset

# Re-seed database
npx prisma db seed

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check `.env` DATABASE_URL is correct
- Verify database credentials

### Port 3000 Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Missing Dependencies
```bash
npm install
```

## Quick Feature Tour

### For Students
1. **Home Page**: See all upcoming events and weekly updates
2. **Search**: Filter by category or search by keywords
3. **Campus World**: Interactive map of event locations
4. **Event Details**: View full information and book tickets
5. **My Tickets**: Access all booked tickets with QR codes
6. **Calendar**: View events in calendar format
7. **Profile**: Manage followed societies

### For Organisers
1. **Dashboard**: View revenue, ticket sales, and analytics
2. **Create Event**: Comprehensive event creation with conflict detection
3. **Event Management**: Track performance of all created events

## Next Steps

- Explore all event categories
- Try booking multiple ticket types
- Test the conflict detection system when creating events
- Check out the calendar filtering options
- View the organiser dashboard analytics

## Support

If you encounter issues:
1. Check the main README.md for detailed documentation
2. Ensure all prerequisites are installed
3. Verify database connection
4. Check terminal for error messages

## Database Management

### View Data in Prisma Studio
```bash
npx prisma studio
```
Opens a web interface at [http://localhost:5555](http://localhost:5555)

### Reset Everything
```bash
npx prisma migrate reset
npx prisma db seed
```

## Development Tips

- Hot reload is enabled - changes auto-refresh
- Check browser console for client-side errors
- Check terminal for server-side errors
- Use Prisma Studio to inspect database state

Enjoy exploring the TCD Ticket Booking System!
