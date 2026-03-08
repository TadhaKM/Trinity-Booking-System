/**
 * Demo seed script — populates Turso (or local dev.db) with realistic TCD Tickets data.
 * Uses @libsql/client directly to avoid Prisma file-lock issues on Windows.
 *
 * Run with:  npx tsx prisma/seed.ts
 *
 * Demo accounts:
 *   customer@tcd.ie   / demo1234
 *   organiser@tcd.ie  / demo1234  (organiser — owns Drama + Orchestra events)
 *   admin@tcd.ie      / demo1234  (admin)
 * Coupons: STUDENT20 (20% off)  TRINITY10 (10% off)
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomBytes } from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const tursoUrl  = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const db = (tursoUrl && tursoToken)
  ? createClient({ url: tursoUrl, authToken: tursoToken })
  : createClient({ url: 'file:./prisma/dev.db' });

// ── Tiny helpers ──────────────────────────────────────────────────────────────

const cuid = () => 'c' + randomBytes(11).toString('hex');
const now  = () => new Date().toISOString();
const fromNow = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); };
const ago     = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString(); };
const exec = (sql: string, args: any[] = []) => db.execute({ sql, args });

// ── Wipe ──────────────────────────────────────────────────────────────────────

async function clear() {
  console.log('  Wiping existing data…');
  const tables = [
    'AuditLog','PushSubscription','RefundRequest','CheckInLog',
    'Notification','WaitlistEntry','SavedEvent','PostLike','EventComment',
    'Ticket','Order','TicketType','SocietyPost','SocietyFollower',
    'Event','Society','Coupon','User',
  ];
  for (const t of tables) await exec(`DELETE FROM "${t}" WHERE 1=1`).catch(() => {});
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Seeding TCD Tickets demo data…\n');
  await clear();

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log('  Creating users…');
  const pw = await bcrypt.hash('demo1234', 10);
  const [custId, orgId, org2Id, adminId] = [cuid(), cuid(), cuid(), cuid()];

  await exec(
    `INSERT INTO "User" (id,email,name,password,isOrganiser,isAdmin,isBanned,createdAt,updatedAt)
     VALUES (?,?,?,?,0,0,0,?,?)`,
    [custId, 'customer@tcd.ie', 'Alex Murphy', pw, now(), now()],
  );
  await exec(
    `INSERT INTO "User" (id,email,name,password,isOrganiser,isAdmin,isBanned,createdAt,updatedAt)
     VALUES (?,?,?,?,1,0,0,?,?)`,
    [orgId, 'organiser@tcd.ie', 'Jordan Brennan', pw, now(), now()],
  );
  await exec(
    `INSERT INTO "User" (id,email,name,password,isOrganiser,isAdmin,isBanned,createdAt,updatedAt)
     VALUES (?,?,?,?,1,0,0,?,?)`,
    [org2Id, 'organiser2@tcd.ie', 'Saoirse Kelly', pw, now(), now()],
  );
  await exec(
    `INSERT INTO "User" (id,email,name,password,isOrganiser,isAdmin,isBanned,createdAt,updatedAt)
     VALUES (?,?,?,?,1,1,0,?,?)`,
    [adminId, 'admin@tcd.ie', 'Admin User', pw, now(), now()],
  );

  // ── Societies ─────────────────────────────────────────────────────────────
  console.log('  Creating societies…');
  const [dramaId, musicId, sportsId, techId, debateId] = [cuid(), cuid(), cuid(), cuid(), cuid()];

  const societies = [
    [dramaId,  'TCD Drama Society',     "Trinity's oldest dramatic society, staging everything from Shakespeare to modern experimental theatre in the Beckett Theatre.",                       'Arts & Culture',     'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&auto=format&fit=crop', JSON.stringify({lat:53.3441,lng:-6.2546})],
    [musicId,  'Trinity Orchestra',     "One of Ireland's premier student orchestras, performing classical and contemporary works in the magnificent Examination Hall.",                       'Music',              'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop', JSON.stringify({lat:53.3445,lng:-6.2541})],
    [sportsId, 'Trinity Athletics',     'Representing Trinity in competitions across Ireland and Europe. Home to multiple national champions and international competitors.',                  'Sports & Fitness',   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop', JSON.stringify({lat:53.3430,lng:-6.2560})],
    [techId,   'Trinity Tech Society',  'Bridging academia and industry — hackathons, workshops, speaker nights, and career events with leading technology companies.',                       'Academic',           'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&auto=format&fit=crop', JSON.stringify({lat:53.3438,lng:-6.2550})],
    [debateId, 'The Phil',              "The College Historical Society — the world's oldest student debating society, founded in 1770. Home to some of history's greatest speakers.",       'Debate & Speaking',  'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&auto=format&fit=crop', JSON.stringify({lat:53.3440,lng:-6.2535})],
  ];

  for (const [id, name, desc, cat, img, loc] of societies) {
    await exec(
      `INSERT INTO "Society" (id,name,description,category,imageUrl,location,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, name, desc, cat, img, loc, now(), now()],
    );
  }

  // Follows
  for (const sid of [dramaId, musicId, techId])
    await exec(`INSERT INTO "SocietyFollower" (id,userId,societyId,createdAt) VALUES (?,?,?,?)`, [cuid(), custId, sid, now()]).catch(() => {});
  for (const sid of [dramaId, sportsId])
    await exec(`INSERT INTO "SocietyFollower" (id,userId,societyId,createdAt) VALUES (?,?,?,?)`, [cuid(), orgId, sid, now()]).catch(() => {});
  for (const sid of [techId, debateId, musicId, sportsId])
    await exec(`INSERT INTO "SocietyFollower" (id,userId,societyId,createdAt) VALUES (?,?,?,?)`, [cuid(), adminId, sid, now()]).catch(() => {});

  // ── Events ────────────────────────────────────────────────────────────────
  console.log('  Creating events…');

  interface TT { name: string; price: number; quantity: number; available: number }
  interface Ev  { id: string; societyId: string; organiserId: string; title: string; description: string;
                  location: string; coords: string; category: string; imageUrl: string; tags: string;
                  start: string; end: string; cap: number | null; policy: string | null; faq: string | null;
                  tts: TT[] }

  const events: Ev[] = [
    {
      id: cuid(), societyId: dramaId, organiserId: orgId,
      title: 'Hamlet — Spring Production',
      description: "Trinity Drama Society presents Shakespeare's timeless tragedy in a stunning modern adaptation. Set in a contemporary political landscape, this production reimagines Elsinore as a glass-and-steel corporate empire.\n\nRuns nightly with a Sunday matinée. Post-show talkbacks on Thursday.",
      location: 'Beckett Theatre, TCD', coords: JSON.stringify({lat:53.3441,lng:-6.2548}),
      category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['theatre','shakespeare','drama','beckett']),
      start: fromNow(14), end: fromNow(14), cap: 200,
      policy: 'Tickets are non-refundable within 48 hours of the performance.',
      faq: JSON.stringify([{q:'Is there parking nearby?',a:'Parking available on Nassau Street and Dawson Street.'},{q:'Are under-18s welcome?',a:'Suitable for ages 14+.'}]),
      tts: [{name:'Standard',price:12,quantity:120,available:87},{name:'Student Concession',price:8,quantity:60,available:34},{name:'VIP Front Row',price:25,quantity:20,available:6}],
    },
    {
      id: cuid(), societyId: musicId, organiserId: orgId,
      title: 'Trinity Orchestra — Spring Concert',
      description: "An unforgettable evening as Trinity Orchestra performs Beethoven's Symphony No. 9 alongside works by Sibelius and Ravel in the magnificent Examination Hall.\n\nGuest conductor: Dr. Aoife Ní Bhriain.",
      location: 'Examination Hall, TCD', coords: JSON.stringify({lat:53.3446,lng:-6.2542}),
      category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['classical','orchestra','beethoven','concert']),
      start: fromNow(21), end: fromNow(21), cap: 300,
      policy: 'Full refunds available up to 7 days before the event.',
      faq: JSON.stringify([{q:'How long is the concert?',a:'Approximately 2 hours including an interval.'},{q:'Dress code?',a:'Smart casual recommended.'}]),
      tts: [{name:'General Admission',price:15,quantity:200,available:143},{name:'Student',price:10,quantity:80,available:52},{name:'Premium Reserved',price:30,quantity:20,available:8}],
    },
    {
      id: cuid(), societyId: techId, organiserId: org2Id,
      title: 'TCD Hackathon 2026',
      description: "48 hours. €5,000 in prizes. Build something that matters.\n\nTrinity's biggest hackathon with challenges across AI, sustainability, fintech, and social impact. Sponsored by Google, Stripe, and Accenture. Teams of 1–4. Meals and caffeine provided throughout.",
      location: "O'Reilly Institute, TCD", coords: JSON.stringify({lat:53.3435,lng:-6.2552}),
      category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['hackathon','coding','tech','prizes','ai']),
      start: fromNow(7), end: fromNow(9), cap: 150,
      policy: 'Registration is free. Teams must check in by 9am on day 1.',
      faq: JSON.stringify([{q:'Do I need a team?',a:"Register solo and we'll match you."},{q:'What to bring?',a:'Laptop, charger, and enthusiasm.'}]),
      tts: [{name:'Hacker Pass',price:0,quantity:120,available:67},{name:'Mentor Pass',price:0,quantity:30,available:18}],
    },
    {
      id: cuid(), societyId: debateId, organiserId: org2Id,
      title: 'The Phil — Annual Bram Stoker Debate',
      description: 'The College Historical Society\'s flagship debate. This year\'s motion: "This House Believes That Artificial Intelligence Poses an Existential Threat to Democracy."\n\nGuest speakers include a sitting TD and a leading Silicon Valley AI researcher.',
      location: 'Edmund Burke Theatre, TCD', coords: JSON.stringify({lat:53.3442,lng:-6.2536}),
      category: 'Debate & Speaking', imageUrl: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['debate','politics','ai','philosophy','the-phil']),
      start: fromNow(10), end: fromNow(10), cap: 250,
      policy: 'Doors open 30 minutes before the debate.', faq: null,
      tts: [{name:'General',price:5,quantity:200,available:134},{name:'Student',price:0,quantity:50,available:21}],
    },
    {
      id: cuid(), societyId: sportsId, organiserId: org2Id,
      title: 'Trinity 5K Charity Run',
      description: "Join hundreds of Trinity students and staff for our annual charity 5K through Dublin 2. All proceeds go to St. Vincent de Paul Ireland.\n\nRoute takes in Trinity's campus, Merrion Square, and St Stephen's Green. All fitness levels welcome.",
      location: 'Front Square, TCD', coords: JSON.stringify({lat:53.3439,lng:-6.2543}),
      category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['running','charity','fitness','5k','outdoor']),
      start: fromNow(30), end: fromNow(30), cap: 500,
      policy: 'No refunds. Race pack collection from 8am on race day.',
      faq: JSON.stringify([{q:'Minimum age?',a:'16 or over.'},{q:'Will medals be given?',a:'All finishers receive a medal and t-shirt.'}]),
      tts: [{name:'Race Entry',price:10,quantity:400,available:267},{name:'Student Entry',price:6,quantity:100,available:58}],
    },
    {
      id: cuid(), societyId: dramaId, organiserId: orgId,
      title: 'Improv Night — "No Script, No Problem"',
      description: "Trinity Drama's improv troupe takes the stage for a night of pure, unscripted comedy chaos. Audience suggestions drive the scenes.\n\nPerfect for a midweek laugh. BYOB to the post-show social in the Pav.",
      location: 'Luce Hall, TCD', coords: JSON.stringify({lat:53.3443,lng:-6.2549}),
      category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['improv','comedy','theatre','fun']),
      start: fromNow(5), end: fromNow(5), cap: 80,
      policy: null, faq: null,
      tts: [{name:'Entry',price:5,quantity:80,available:43}],
    },
    {
      id: cuid(), societyId: techId, organiserId: org2Id,
      title: 'AI & Machine Learning Workshop',
      description: "A hands-on full-day workshop covering modern ML with PyTorch and HuggingFace. No prior ML experience needed — just bring a laptop.\n\nTopics: neural networks, transformer models, fine-tuning LLMs, deploying to production. Led by PhD researchers from the ADAPT Centre.",
      location: 'Lloyd Institute, TCD', coords: JSON.stringify({lat:53.3436,lng:-6.2555}),
      category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['ai','machine-learning','python','workshop','pytorch']),
      start: fromNow(18), end: fromNow(18), cap: 60,
      policy: 'Places limited. Cancellations must be made 48h in advance.',
      faq: JSON.stringify([{q:'Python experience needed?',a:"Basic Python only — we'll handle the rest."},{q:'Slides shared?',a:'Yes, posted to the Tech Society Discord after.'}]),
      tts: [{name:'Workshop Ticket',price:8,quantity:60,available:22}],
    },
    {
      id: cuid(), societyId: musicId, organiserId: orgId,
      title: 'Jazz Night at the Pav',
      description: "Kick back in Trinity's iconic Pavilion Bar for an evening of live jazz from the Trinity Jazz Ensemble. Three sets covering Miles Davis to modern fusion.\n\nFood available from the bar. Doors at 7pm, first set at 7:30pm.",
      location: 'The Pavilion Bar, TCD', coords: JSON.stringify({lat:53.3433,lng:-6.2538}),
      category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&auto=format&fit=crop',
      tags: JSON.stringify(['jazz','music','live','pav','social']),
      start: fromNow(3), end: fromNow(3), cap: 100,
      policy: null, faq: null,
      tts: [{name:'Entry',price:7,quantity:100,available:61}],
    },
  ];

  const ttMap: Record<string, {id:string; name:string; price:number}[]> = {};

  for (const ev of events) {
    await exec(
      `INSERT INTO "Event"
         (id,societyId,organiserId,title,description,startDate,endDate,
          location,locationCoords,category,imageUrl,tags,
          venueCapacity,policy,faqJson,isPublished,isCancelled,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?,?)`,
      [ev.id,ev.societyId,ev.organiserId,ev.title,ev.description,
       ev.start,ev.end,ev.location,ev.coords,ev.category,ev.imageUrl,ev.tags,
       ev.cap??null,ev.policy??null,ev.faq??null,now(),now()],
    );
    ttMap[ev.id] = [];
    for (const tt of ev.tts) {
      const ttId = cuid();
      await exec(
        `INSERT INTO "TicketType" (id,eventId,name,price,quantity,available,createdAt) VALUES (?,?,?,?,?,?,?)`,
        [ttId,ev.id,tt.name,tt.price,tt.quantity,tt.available,now()],
      );
      ttMap[ev.id].push({id:ttId, name:tt.name, price:tt.price});
    }
  }

  // ── Customer orders (4 events) ────────────────────────────────────────────
  console.log('  Creating customer orders…');
  for (let i = 0; i < 4; i++) {
    const ev  = events[i];
    const tt  = ttMap[ev.id][Math.min(1, ttMap[ev.id].length - 1)];
    const oid = cuid(), tid = cuid();
    const qr  = `TCD-${ev.id.slice(-6).toUpperCase()}-${tid.slice(-6).toUpperCase()}`;
    const at  = ago(i + 1);
    await exec(
      `INSERT INTO "Order" (id,userId,eventId,totalAmount,status,stripePaymentIntentId,createdAt) VALUES (?,?,?,?,?,?,?)`,
      [oid, custId, ev.id, tt.price, 'CONFIRMED', `pi_demo_${oid.slice(-8)}`, at],
    );
    const checked = i === 0;
    await exec(
      `INSERT INTO "Ticket" (id,orderId,ticketTypeId,price,qrCode,checkedInAt,isRefunded,createdAt) VALUES (?,?,?,?,?,?,0,?)`,
      [tid, oid, tt.id, tt.price, qr, checked ? ago(1) : null, at],
    );
    if (checked)
      await exec(
        `INSERT INTO "CheckInLog" (id,ticketId,eventId,scannedBy,scannedAt) VALUES (?,?,?,?,?)`,
        [cuid(), tid, ev.id, orgId, ago(1)],
      );
  }

  // ── 30-day revenue history (for organiser analytics charts) ───────────────
  console.log('  Generating 30 days of revenue history…');
  for (let dBack = 29; dBack >= 1; dBack--) {
    const count = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < count; j++) {
      const ev  = events[j % 2];
      const tts = ttMap[ev.id];
      const tt  = tts[Math.floor(Math.random() * tts.length)];
      const oid = cuid(), tid = cuid();
      const at  = ago(dBack);
      await exec(
        `INSERT INTO "Order" (id,userId,eventId,totalAmount,status,stripePaymentIntentId,createdAt) VALUES (?,?,?,?,?,?,?)`,
        [oid, adminId, ev.id, tt.price, 'CONFIRMED', `pi_hist_${oid.slice(-8)}`, at],
      );
      await exec(
        `INSERT INTO "Ticket" (id,orderId,ticketTypeId,price,qrCode,isRefunded,createdAt) VALUES (?,?,?,?,?,0,?)`,
        [tid, oid, tt.id, tt.price, `TCD-H-${tid.slice(-10).toUpperCase()}`, at],
      );
    }
  }

  // ── Saved events ──────────────────────────────────────────────────────────
  for (const ev of [events[2], events[4], events[6]])
    await exec(`INSERT INTO "SavedEvent" (id,userId,eventId,createdAt) VALUES (?,?,?,?)`, [cuid(), custId, ev.id, now()]);

  // ── Society posts ─────────────────────────────────────────────────────────
  console.log('  Creating society posts…');
  const rawPosts: [string, string|null, string, string, number][] = [
    [dramaId,  events[0].id, 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&auto=format&fit=crop', "🎭 Rehearsals are in full swing for Hamlet! The cast is incredible — tickets selling fast.", 1],
    [musicId,  events[1].id, 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop', "The orchestra has been rehearsing Beethoven's 9th for months. Spring Concert tickets are live!", 1],
    [techId,   events[2].id, 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&auto=format&fit=crop', "Hackathon 2026 registrations are OPEN. €5k in prizes, free food. Who's in? 🚀", 0],
    [debateId, events[3].id, 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&auto=format&fit=crop', "The motion for our Bram Stoker Debate has been announced. Come and argue your side.", 0],
    [dramaId,  null,         'https://images.unsplash.com/photo-1571266028243-d220c6b8776d?w=600&auto=format&fit=crop', "Behind the scenes: our set design team has been working round the clock for Hamlet.", 0],
  ];
  for (const [sid, eid, img, cap, pin] of rawPosts) {
    const pid = cuid();
    await exec(
      `INSERT INTO "SocietyPost" (id,societyId,eventId,imageUrl,caption,isPinned,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
      [pid, sid, eid, img, cap, pin, ago(Math.floor(Math.random() * 5)), now()],
    );
    for (const uid of [custId, orgId].slice(0, Math.floor(Math.random() * 3)))
      await exec(`INSERT INTO "PostLike" (id,userId,postId,createdAt) VALUES (?,?,?,?)`, [cuid(), uid, pid, now()]).catch(() => {});
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  console.log('  Creating event comments…');
  const c1 = cuid(), c2 = cuid();
  await exec(
    `INSERT INTO "EventComment" (id,eventId,userId,parentId,body,isHidden,createdAt,updatedAt) VALUES (?,?,?,NULL,?,0,?,?)`,
    [c1, events[0].id, custId,  'Saw the dress rehearsal — this is going to be phenomenal. The set design alone is worth the price of admission!', ago(3), now()],
  );
  await exec(
    `INSERT INTO "EventComment" (id,eventId,userId,parentId,body,isHidden,createdAt,updatedAt) VALUES (?,?,?,NULL,?,0,?,?)`,
    [c2, events[0].id, adminId, 'Is there a student discount available on the door, or only online?', ago(2), now()],
  );
  await exec(
    `INSERT INTO "EventComment" (id,eventId,userId,parentId,body,isHidden,createdAt,updatedAt) VALUES (?,?,?,?,?,0,?,?)`,
    [cuid(), events[0].id, orgId, c2, 'Hi! Student concession tickets are online only — grab them before they sell out!', ago(1), now()],
  );

  // ── Notifications (for customer) ──────────────────────────────────────────
  const notifs: [string,string,string,string,number,number][] = [
    ['BOOKING_CONFIRMED', 'Booking confirmed!', 'Your tickets for Hamlet — Spring Production are confirmed.', `/events/${events[0].id}`, 1, 1],
    ['BOOKING_CONFIRMED', 'Booking confirmed!', 'Your tickets for Trinity Orchestra — Spring Concert are confirmed.', `/events/${events[1].id}`, 1, 2],
    ['NEW_EVENT',         'New from Trinity Tech Society', 'AI & Machine Learning Workshop has just been posted.',      `/events/${events[6].id}`, 0, 0],
    ['EVENT_REMINDER',    'Event tomorrow: Jazz Night at the Pav', "Don't forget — Jazz Night at the Pav is tomorrow at 7pm!", `/events/${events[7].id}`, 0, 0],
  ];
  for (const [type, title, body, link, read, dBack] of notifs)
    await exec(
      `INSERT INTO "Notification" (id,userId,type,title,body,link,read,createdAt) VALUES (?,?,?,?,?,?,?,?)`,
      [cuid(), custId, type, title, body, link, read, ago(dBack)],
    );

  // ── Audit log ─────────────────────────────────────────────────────────────
  for (const ev of events.slice(0, 3))
    await exec(
      `INSERT INTO "AuditLog" (id,actorId,action,entityType,entityId,details,createdAt) VALUES (?,?,?,?,?,?,?)`,
      [cuid(), adminId, 'PUBLISH_EVENT', 'event', ev.id, JSON.stringify({title:ev.title}), ago(Math.floor(Math.random()*7)+1)],
    );

  // ── Coupons ───────────────────────────────────────────────────────────────
  await exec(
    `INSERT INTO "Coupon" (id,code,discountPercent,expiresAt,maxUses,usedCount,createdAt) VALUES (?,?,?,?,?,?,?)`,
    [cuid(), 'STUDENT20', 20, fromNow(90), 100, 12, now()],
  );
  await exec(
    `INSERT INTO "Coupon" (id,code,discountPercent,expiresAt,maxUses,usedCount,createdAt) VALUES (?,?,?,?,?,?,?)`,
    [cuid(), 'TRINITY10', 10, fromNow(30),  50,  5, now()],
  );

  console.log('\n✅  Seed complete!\n');
  console.log('  ───────────────────────────────────────────────────');
  console.log('  customer@tcd.ie   / demo1234   (customer)');
  console.log('  organiser@tcd.ie  / demo1234   (organiser — Drama + Orchestra events)');
  console.log('  admin@tcd.ie      / demo1234   (admin)');
  console.log('  ───────────────────────────────────────────────────');
  console.log('  Coupon codes:  STUDENT20 (20% off)   TRINITY10 (10% off)');
  console.log('  8 events · 5 societies · 30 days of revenue history\n');
  process.exit(0);
}

main().catch(e => { console.error('\n❌  Seed failed:', e); process.exit(1); });
