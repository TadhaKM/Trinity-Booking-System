import { createClient } from '@libsql/client';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL!;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN!;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env');
  process.exit(1);
}

const libsql = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function createTables() {
  console.log('Creating tables on Turso...');

  const statements = [
    // Drop existing tables (in order due to foreign keys)
    `DROP TABLE IF EXISTS "Ticket"`,
    `DROP TABLE IF EXISTS "Order"`,
    `DROP TABLE IF EXISTS "TicketType"`,
    `DROP TABLE IF EXISTS "Coupon"`,
    `DROP TABLE IF EXISTS "Event"`,
    `DROP TABLE IF EXISTS "SocietyFollower"`,
    `DROP TABLE IF EXISTS "Society"`,
    `DROP TABLE IF EXISTS "User"`,

    // Create tables
    `CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "password" TEXT NOT NULL DEFAULT '',
      "isOrganiser" INTEGER NOT NULL DEFAULT 0,
      "profilePicture" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,

    `CREATE TABLE "Society" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "location" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE "SocietyFollower" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "societyId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SocietyFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "SocietyFollower_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX "SocietyFollower_userId_societyId_key" ON "SocietyFollower"("userId", "societyId")`,

    `CREATE TABLE "Event" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "societyId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "startDate" DATETIME NOT NULL,
      "endDate" DATETIME NOT NULL,
      "location" TEXT NOT NULL,
      "locationCoords" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "tags" TEXT NOT NULL,
      "organiserId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Event_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE TABLE "TicketType" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "eventId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "quantity" INTEGER NOT NULL,
      "available" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE TABLE "Coupon" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "discountPercent" INTEGER NOT NULL,
      "expiresAt" DATETIME NOT NULL,
      "maxUses" INTEGER NOT NULL,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code")`,

    `CREATE TABLE "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "totalAmount" REAL NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,

    `CREATE TABLE "Ticket" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "ticketTypeId" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "qrCode" TEXT NOT NULL,
      "checkedInAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX "Ticket_qrCode_key" ON "Ticket"("qrCode")`,
  ];

  for (const sql of statements) {
    await libsql.execute(sql);
  }

  console.log('Tables created successfully!');
}

async function seedData() {
  console.log('Seeding data to Turso...');

  const adapter = new PrismaLibSQL(libsql);
  const prisma = new PrismaClient({ adapter } as any);

  try {
    // Create Users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: 'student@tcd.ie',
          name: 'John Smith',
          password: 'password123',
          isOrganiser: false,
        },
      }),
      prisma.user.create({
        data: {
          email: 'organiser@tcd.ie',
          name: 'Sarah Jones',
          password: 'password123',
          isOrganiser: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'alice@tcd.ie',
          name: 'Alice Murphy',
          password: 'password123',
          isOrganiser: false,
        },
      }),
      prisma.user.create({
        data: {
          email: 'bob@tcd.ie',
          name: "Bob O'Brien",
          password: 'password123',
          isOrganiser: true,
        },
      }),
    ]);

    console.log(`Created ${users.length} users`);

    // Create Societies
    const societyData = [
      { name: 'DU Players', description: "Trinity's premier drama society, staging productions in the Samuel Beckett Theatre.", category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800' },
      { name: 'Computer Science Society', description: 'Promoting tech culture through hackathons, talks, and workshops.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800' },
      { name: 'Celtic Music Society', description: 'Celebrating Irish traditional music with weekly sessions and concerts.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800' },
      { name: 'Philosophical Society', description: "Ireland's oldest student society, hosting debates and speaker events since 1683.", category: 'Debate & Speaking', imageUrl: 'https://images.unsplash.com/photo-1574168104291-ac4e706a3adb?w=800' },
      { name: 'Dance Society', description: 'From ballroom to hip-hop, showcasing diverse dance styles.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800' },
      { name: 'Film Society', description: 'Weekly screenings, film production workshops, and cinema trips.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },
      { name: 'Trinity South Asian Society', description: 'Celebrating South Asian culture through Diwali, Holi, cultural nights, and community events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=800' },
      { name: 'African Caribbean Society', description: 'Promoting African and Caribbean culture, heritage, and community.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800' },
      { name: 'Chinese Society', description: 'Bringing Chinese culture to Trinity through events, festivals, and language exchange.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?w=800' },
      { name: 'Law Society', description: 'Mooting competitions, legal debates, and career networking.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800' },
      { name: 'Engineering Society', description: 'Engineering projects, industry talks, and site visits.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800' },
      { name: 'Photography Society', description: 'Photo walks, darkroom workshops, and exhibitions.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800' },
      { name: 'Orchestra Society', description: 'Classical music performances and orchestral concerts.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800' },
      { name: 'Rowing Club', description: 'Competitive rowing on the Liffey and fitness training.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=800' },
      { name: 'Rugby Club', description: 'Rugby training, matches, and social events.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1544298621-a28b8d14c02e?w=800' },
      { name: 'LGBTQ+ Society', description: 'LGBTQ+ community, pride events, and support networks.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800' },
      { name: 'Volunteer Society', description: 'Volunteering opportunities, charity drives, and community service.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800' },
      { name: 'Chess Society', description: 'Chess tournaments, lessons, and casual play.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800' },
      { name: 'Entrepreneurship Society', description: 'Startup pitches, entrepreneurship workshops, and networking.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800' },
      { name: 'Medical Society', description: 'Healthcare talks, anatomy workshops, and medical career events.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800' },
    ];

    const societies = await Promise.all(
      societyData.map((data, index) =>
        prisma.society.create({
          data: {
            ...data,
            location: JSON.stringify({ lat: 53.343 + (index * 0.0001), lng: -6.254 + (index * 0.0001) }),
          },
        })
      )
    );

    console.log(`Created ${societies.length} societies`);

    // Create Events
    const events = await Promise.all([
      prisma.event.create({
        data: {
          title: 'Waiting for Godot',
          description: "A masterful production of Samuel Beckett's absurdist masterpiece.",
          societyId: societies[0].id,
          startDate: new Date('2026-03-15T19:30:00'),
          endDate: new Date('2026-03-15T21:30:00'),
          location: 'Samuel Beckett Theatre',
          locationCoords: JSON.stringify({ lat: 53.34305, lng: -6.25475 }),
          category: 'Arts & Culture',
          imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
          tags: JSON.stringify(['theatre', 'drama', 'beckett']),
          organiserId: users[1].id,
          ticketTypes: {
            create: [
              { name: 'Standard', price: 12.0, quantity: 150, available: 150 },
              { name: 'Student', price: 8.0, quantity: 100, available: 100 },
            ],
          },
        },
      }),
      prisma.event.create({
        data: {
          title: 'Trinity Hackathon 2026',
          description: '24-hour coding marathon with prizes, workshops, and free pizza!',
          societyId: societies[1].id,
          startDate: new Date('2026-03-20T09:00:00'),
          endDate: new Date('2026-03-21T09:00:00'),
          location: "O'Reilly Institute",
          locationCoords: JSON.stringify({ lat: 53.34265, lng: -6.25185 }),
          category: 'Academic',
          imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
          tags: JSON.stringify(['hackathon', 'coding', 'tech']),
          organiserId: users[3].id,
          ticketTypes: {
            create: [
              { name: 'Participant', price: 0.0, quantity: 200, available: 200 },
            ],
          },
        },
      }),
      prisma.event.create({
        data: {
          title: 'Traditional Irish Session',
          description: 'Weekly trad session — all musicians welcome. Bring your instruments!',
          societyId: societies[2].id,
          startDate: new Date('2026-02-20T19:00:00'),
          endDate: new Date('2026-02-20T22:00:00'),
          location: 'The Buttery',
          locationCoords: JSON.stringify({ lat: 53.34365, lng: -6.25415 }),
          category: 'Music',
          imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
          tags: JSON.stringify(['trad', 'session', 'irish music']),
          organiserId: users[1].id,
          ticketTypes: {
            create: [
              { name: 'Entry', price: 0.0, quantity: 100, available: 100 },
            ],
          },
        },
      }),
      prisma.event.create({
        data: {
          title: 'The Phil Debate: Climate Action',
          description: 'Motion: "This house believes climate activism justifies civil disobedience"',
          societyId: societies[3].id,
          startDate: new Date('2026-02-27T19:30:00'),
          endDate: new Date('2026-02-27T21:30:00'),
          location: 'Graduates Memorial Building (GMB)',
          locationCoords: JSON.stringify({ lat: 53.34395, lng: -6.25545 }),
          category: 'Debate & Speaking',
          imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
          tags: JSON.stringify(['debate', 'climate', 'politics']),
          organiserId: users[3].id,
          ticketTypes: {
            create: [
              { name: 'General Admission', price: 3.0, quantity: 120, available: 120 },
            ],
          },
        },
      }),
      prisma.event.create({
        data: {
          title: 'Winter Dance Showcase',
          description: 'Annual showcase featuring ballet, contemporary, hip-hop, and ballroom.',
          societyId: societies[4].id,
          startDate: new Date('2026-03-05T19:00:00'),
          endDate: new Date('2026-03-05T21:30:00'),
          location: 'Dining Hall, Front Square',
          locationCoords: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
          category: 'Sports & Fitness',
          imageUrl: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800',
          tags: JSON.stringify(['dance', 'showcase', 'performance']),
          organiserId: users[1].id,
          ticketTypes: {
            create: [
              { name: 'Standard', price: 8.0, quantity: 180, available: 180 },
              { name: 'Concession', price: 5.0, quantity: 70, available: 70 },
            ],
          },
        },
      }),
      prisma.event.create({
        data: {
          title: 'Cult Classic: The Big Lebowski',
          description: 'Late night screening of the Coen Brothers classic. The Dude abides.',
          societyId: societies[5].id,
          startDate: new Date('2026-02-21T21:00:00'),
          endDate: new Date('2026-02-21T23:15:00'),
          location: 'Science Gallery, Pearse Street',
          locationCoords: JSON.stringify({ lat: 53.34215, lng: -6.25105 }),
          category: 'Arts & Culture',
          imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
          tags: JSON.stringify(['film', 'screening', 'cult classic']),
          organiserId: users[3].id,
          ticketTypes: {
            create: [
              { name: 'General Admission', price: 3.0, quantity: 150, available: 150 },
            ],
          },
        },
      }),
    ]);

    console.log(`Created ${events.length} events`);

    // Create Coupons
    const coupons = await Promise.all([
      prisma.coupon.create({
        data: { code: 'WELCOME2026', discountPercent: 20, expiresAt: new Date('2026-12-31'), maxUses: 1000, usedCount: 0 },
      }),
      prisma.coupon.create({
        data: { code: 'STUDENT50', discountPercent: 50, expiresAt: new Date('2026-06-30'), maxUses: 500, usedCount: 0 },
      }),
      prisma.coupon.create({
        data: { code: 'EARLYBIRD', discountPercent: 15, expiresAt: new Date('2026-03-01'), maxUses: 200, usedCount: 0 },
      }),
    ]);

    console.log(`Created ${coupons.length} coupons`);

    // Create society followers
    await prisma.societyFollower.createMany({
      data: [
        { userId: users[0].id, societyId: societies[0].id },
        { userId: users[0].id, societyId: societies[1].id },
        { userId: users[1].id, societyId: societies[2].id },
        { userId: users[1].id, societyId: societies[3].id },
        { userId: users[1].id, societyId: societies[5].id },
        { userId: users[2].id, societyId: societies[2].id },
        { userId: users[2].id, societyId: societies[4].id },
        { userId: users[3].id, societyId: societies[1].id },
        { userId: users[3].id, societyId: societies[3].id },
      ],
    });

    console.log('Created society followers');
    console.log('\nTurso database setup complete!');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await createTables();
  await seedData();
}

main().catch((e) => {
  console.error('Setup failed:', e);
  process.exit(1);
});
