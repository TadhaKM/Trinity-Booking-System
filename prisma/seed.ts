import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.societyFollower.deleteMany();
  await prisma.society.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'student@tcd.ie',
        name: 'John Smith',
        isOrganiser: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'organiser@tcd.ie',
        name: 'Sarah Jones',
        isOrganiser: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'alice@tcd.ie',
        name: 'Alice Murphy',
        isOrganiser: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@tcd.ie',
        name: "Bob O'Brien",
        isOrganiser: true,
      },
    }),
  ]);

  // Create Societies
  const societies = await Promise.all([
    prisma.society.create({
      data: {
        name: 'DU Players',
        description:
          "Trinity's premier drama society, staging productions in the Samuel Beckett Theatre.",
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
        location: JSON.stringify({ lat: 53.34305, lng: -6.25475 }),
      },
    }),
    prisma.society.create({
      data: {
        name: 'Computer Science Society',
        description:
          'Promoting tech culture through hackathons, talks, and workshops.',
        category: 'Academic',
        imageUrl:
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
        location: JSON.stringify({ lat: 53.34265, lng: -6.25185 }),
      },
    }),
    prisma.society.create({
      data: {
        name: 'Celtic Music Society',
        description:
          'Celebrating Irish traditional music with weekly sessions and concerts.',
        category: 'Music',
        imageUrl:
          'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
        location: JSON.stringify({ lat: 53.34365, lng: -6.25415 }),
      },
    }),
    prisma.society.create({
      data: {
        name: 'Philosophical Society',
        description:
          "Ireland's oldest student society, hosting debates and speaker events since 1683.",
        category: 'Debate & Speaking',
        imageUrl:
          'https://images.unsplash.com/photo-1574168104291-ac4e706a3adb?w=800',
        location: JSON.stringify({ lat: 53.34395, lng: -6.25545 }),
      },
    }),
    prisma.society.create({
      data: {
        name: 'Dance Society',
        description:
          'From ballroom to hip-hop, showcasing diverse dance styles.',
        category: 'Sports & Fitness',
        imageUrl:
          'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
        location: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
      },
    }),
    prisma.society.create({
      data: {
        name: 'Film Society',
        description:
          'Weekly screenings, film production workshops, and cinema trips.',
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
        location: JSON.stringify({ lat: 53.34215, lng: -6.25105 }),
      },
    }),
  ]);

  // Create Events at real TCD buildings
  const events = await Promise.all([
    // DU Players — Samuel Beckett Theatre
    prisma.event.create({
      data: {
        title: 'Waiting for Godot',
        description:
          "A masterful production of Samuel Beckett's absurdist masterpiece. Two evenings of existential comedy.",
        societyId: societies[0].id,
        startDate: new Date('2026-03-15T19:30:00'),
        endDate: new Date('2026-03-15T21:30:00'),
        location: 'Samuel Beckett Theatre',
        locationCoords: JSON.stringify({ lat: 53.34305, lng: -6.25475 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
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
    // DU Players — Players Theatre (Front Square)
    prisma.event.create({
      data: {
        title: 'Improv Comedy Night',
        description:
          'Fast-paced improvisational comedy. Audience participation encouraged!',
        societyId: societies[0].id,
        startDate: new Date('2026-02-28T20:00:00'),
        endDate: new Date('2026-02-28T22:00:00'),
        location: 'Players Theatre, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34385, lng: -6.2557 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
        tags: JSON.stringify(['comedy', 'improv', 'interactive']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            {
              name: 'General Admission',
              price: 6.0,
              quantity: 80,
              available: 80,
            },
          ],
        },
      },
    }),

    // CS Society — O'Reilly Institute
    prisma.event.create({
      data: {
        title: 'Trinity Hackathon 2026',
        description:
          '24-hour coding marathon with prizes, workshops, and free pizza. Build something amazing!',
        societyId: societies[1].id,
        startDate: new Date('2026-03-20T09:00:00'),
        endDate: new Date('2026-03-21T09:00:00'),
        location: "O'Reilly Institute",
        locationCoords: JSON.stringify({ lat: 53.34265, lng: -6.25185 }),
        category: 'Academic',
        imageUrl:
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
        tags: JSON.stringify(['hackathon', 'coding', 'tech']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Participant', price: 0.0, quantity: 200, available: 200 },
          ],
        },
      },
    }),
    // CS Society — Hamilton Building
    prisma.event.create({
      data: {
        title: 'AI & Machine Learning Workshop',
        description:
          'Hands-on introduction to neural networks using TensorFlow. Laptops required.',
        societyId: societies[1].id,
        startDate: new Date('2026-02-25T18:00:00'),
        endDate: new Date('2026-02-25T20:30:00'),
        location: 'Hamilton Building, Lecture Theatre',
        locationCoords: JSON.stringify({ lat: 53.34285, lng: -6.25095 }),
        category: 'Academic',
        imageUrl:
          'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        tags: JSON.stringify(['AI', 'machine learning', 'workshop']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Participant', price: 5.0, quantity: 50, available: 50 },
          ],
        },
      },
    }),

    // Celtic Music — The Buttery
    prisma.event.create({
      data: {
        title: 'Traditional Irish Session',
        description:
          'Weekly trad session — all musicians welcome. Bring your instruments!',
        societyId: societies[2].id,
        startDate: new Date('2026-02-20T19:00:00'),
        endDate: new Date('2026-02-20T22:00:00'),
        location: 'The Buttery',
        locationCoords: JSON.stringify({ lat: 53.34365, lng: -6.25415 }),
        category: 'Music',
        imageUrl:
          'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
        tags: JSON.stringify(['trad', 'session', 'irish music']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Entry', price: 0.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),
    // Celtic Music — Exam Hall
    prisma.event.create({
      data: {
        title: 'Celtic Concert: The Chieftains Tribute',
        description:
          'An evening celebrating The Chieftains with performances from top Irish musicians.',
        societyId: societies[2].id,
        startDate: new Date('2026-03-17T20:00:00'),
        endDate: new Date('2026-03-17T22:30:00'),
        location: 'Exam Hall, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
        category: 'Music',
        imageUrl:
          'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
        tags: JSON.stringify(['concert', 'celtic', 'irish music']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Standard', price: 15.0, quantity: 200, available: 200 },
            { name: 'VIP', price: 25.0, quantity: 50, available: 50 },
          ],
        },
      },
    }),

    // Phil — Graduates Memorial Building (GMB)
    prisma.event.create({
      data: {
        title: 'The Phil Debate: Climate Action',
        description:
          'Motion: "This house believes climate activism justifies civil disobedience"',
        societyId: societies[3].id,
        startDate: new Date('2026-02-27T19:30:00'),
        endDate: new Date('2026-02-27T21:30:00'),
        location: 'Graduates Memorial Building (GMB)',
        locationCoords: JSON.stringify({ lat: 53.34395, lng: -6.25545 }),
        category: 'Debate & Speaking',
        imageUrl:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        tags: JSON.stringify(['debate', 'climate', 'politics']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            {
              name: 'General Admission',
              price: 3.0,
              quantity: 120,
              available: 120,
            },
          ],
        },
      },
    }),
    // Phil — Public Theatre, Front Square
    prisma.event.create({
      data: {
        title: 'Guest Speaker: Dr. Jane Goodall',
        description:
          'An evening with the legendary primatologist and conservationist.',
        societyId: societies[3].id,
        startDate: new Date('2026-04-10T18:00:00'),
        endDate: new Date('2026-04-10T20:00:00'),
        location: 'Public Theatre, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34408, lng: -6.25535 }),
        category: 'Debate & Speaking',
        imageUrl:
          'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
        tags: JSON.stringify(['speaker', 'conservation', 'science']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Student', price: 10.0, quantity: 150, available: 150 },
            { name: 'Staff', price: 15.0, quantity: 50, available: 50 },
          ],
        },
      },
    }),

    // Dance Society — Dining Hall
    prisma.event.create({
      data: {
        title: 'Winter Showcase',
        description:
          'Annual dance showcase featuring ballet, contemporary, hip-hop, and ballroom performances.',
        societyId: societies[4].id,
        startDate: new Date('2026-03-05T19:00:00'),
        endDate: new Date('2026-03-05T21:30:00'),
        location: 'Dining Hall, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
        category: 'Sports & Fitness',
        imageUrl:
          'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800',
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
    // Dance Society — Exam Hall
    prisma.event.create({
      data: {
        title: 'Salsa Night',
        description:
          'Beginner-friendly salsa lesson followed by social dancing. No partner needed!',
        societyId: societies[4].id,
        startDate: new Date('2026-02-22T19:30:00'),
        endDate: new Date('2026-02-22T22:00:00'),
        location: 'Exam Hall, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
        category: 'Sports & Fitness',
        imageUrl:
          'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800',
        tags: JSON.stringify(['salsa', 'dance', 'social']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Entry', price: 4.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),

    // Film Society — Science Gallery
    prisma.event.create({
      data: {
        title: 'Cult Classic: The Big Lebowski',
        description:
          'Late night screening of the Coen Brothers classic. The Dude abides.',
        societyId: societies[5].id,
        startDate: new Date('2026-02-21T21:00:00'),
        endDate: new Date('2026-02-21T23:15:00'),
        location: 'Science Gallery, Pearse Street',
        locationCoords: JSON.stringify({ lat: 53.34215, lng: -6.25105 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
        tags: JSON.stringify(['film', 'screening', 'cult classic']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            {
              name: 'General Admission',
              price: 3.0,
              quantity: 150,
              available: 150,
            },
          ],
        },
      },
    }),
    // Film Society — Arts Building, Lecture Theatre
    prisma.event.create({
      data: {
        title: 'Short Film Competition Finals',
        description:
          'Screening of finalist films made by Trinity students. Audience vote for the winner!',
        societyId: societies[5].id,
        startDate: new Date('2026-03-25T19:00:00'),
        endDate: new Date('2026-03-25T21:30:00'),
        location: 'Arts Building, Lecture Theatre',
        locationCoords: JSON.stringify({ lat: 53.34335, lng: -6.2533 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
        tags: JSON.stringify(['film', 'competition', 'student work']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Entry', price: 5.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),
  ]);

  // Create Coupons
  const coupons = await Promise.all([
    prisma.coupon.create({
      data: {
        code: 'WELCOME2026',
        discountPercent: 20,
        expiresAt: new Date('2026-12-31'),
        maxUses: 1000,
        usedCount: 0,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'STUDENT50',
        discountPercent: 50,
        expiresAt: new Date('2026-06-30'),
        maxUses: 500,
        usedCount: 0,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'EARLYBIRD',
        discountPercent: 15,
        expiresAt: new Date('2026-03-01'),
        maxUses: 200,
        usedCount: 0,
      },
    }),
  ]);

  // Create a sample booking
  const studentTicketType = await prisma.ticketType.findFirst({
    where: { eventId: events[0].id, name: 'Student' },
  });

  if (studentTicketType) {
    await prisma.order.create({
      data: {
        userId: users[0].id,
        eventId: events[0].id,
        totalAmount: 8.4,
        status: 'CONFIRMED',
        tickets: {
          create: [
            {
              ticketTypeId: studentTicketType.id,
              price: 8.0,
              qrCode:
                'QR-' +
                Math.random().toString(36).substr(2, 9).toUpperCase(),
            },
          ],
        },
      },
    });
  }

  // Create society followers
  await prisma.societyFollower.createMany({
    data: [
      { userId: users[0].id, societyId: societies[0].id },
      { userId: users[0].id, societyId: societies[1].id },
      { userId: users[2].id, societyId: societies[2].id },
    ],
  });

  console.log('Database seeded successfully!');
  console.log(`Created ${users.length} users`);
  console.log(`Created ${societies.length} societies`);
  console.log(`Created ${events.length} events`);
  console.log(`Created ${coupons.length} coupons`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
