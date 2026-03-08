/**
 * Phase 2 migration script.
 * Adds new columns and tables to the database (Turso or local SQLite).
 * Run with:  npx tsx scripts/migrate-phase2.ts
 */

import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const client = tursoUrl && tursoToken
  ? createClient({ url: tursoUrl, authToken: tursoToken })
  : createClient({ url: 'file:./prisma/dev.db' });

const migrations: Array<{ name: string; sql: string }> = [
  // ── Existing table columns ───────────────────────────────────────────────
  {
    name: 'User.isBanned',
    sql: `ALTER TABLE "User" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT FALSE`,
  },
  {
    name: 'Event.venueCapacity',
    sql: `ALTER TABLE "Event" ADD COLUMN "venueCapacity" INTEGER`,
  },
  {
    name: 'Event.galleryImages',
    sql: `ALTER TABLE "Event" ADD COLUMN "galleryImages" TEXT`,
  },
  {
    name: 'Event.isPublished',
    sql: `ALTER TABLE "Event" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT TRUE`,
  },
  {
    name: 'Event.isCancelled',
    sql: `ALTER TABLE "Event" ADD COLUMN "isCancelled" BOOLEAN NOT NULL DEFAULT FALSE`,
  },
  {
    name: 'Order.stripePaymentIntentId',
    sql: `ALTER TABLE "Order" ADD COLUMN "stripePaymentIntentId" TEXT`,
  },
  {
    name: 'Ticket.isRefunded',
    sql: `ALTER TABLE "Ticket" ADD COLUMN "isRefunded" BOOLEAN NOT NULL DEFAULT FALSE`,
  },
  {
    name: 'Ticket.refundedAt',
    sql: `ALTER TABLE "Ticket" ADD COLUMN "refundedAt" DATETIME`,
  },

  // ── New tables ───────────────────────────────────────────────────────────
  {
    name: 'RefundRequest table',
    sql: `CREATE TABLE IF NOT EXISTS "RefundRequest" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "orderId"       TEXT NOT NULL,
      "ticketId"      TEXT,
      "userId"        TEXT NOT NULL,
      "reason"        TEXT NOT NULL,
      "status"        TEXT NOT NULL DEFAULT 'PENDING',
      "amount"        REAL NOT NULL,
      "stripeRefundId" TEXT,
      "reviewedBy"    TEXT,
      "reviewNote"    TEXT,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     DATETIME NOT NULL,
      CONSTRAINT "RefundRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "RefundRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "RefundRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
  },
  {
    name: 'RefundRequest.ticketId unique index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "RefundRequest_ticketId_key" ON "RefundRequest"("ticketId")`,
  },
  {
    name: 'EventComment table',
    sql: `CREATE TABLE IF NOT EXISTS "EventComment" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "eventId"   TEXT NOT NULL,
      "userId"    TEXT NOT NULL,
      "parentId"  TEXT,
      "body"      TEXT NOT NULL,
      "isHidden"  BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "EventComment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "EventComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "EventComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EventComment"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    name: 'AuditLog table',
    sql: `CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "actorId"    TEXT NOT NULL,
      "action"     TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId"   TEXT NOT NULL,
      "details"    TEXT,
      "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    name: 'PushSubscription table',
    sql: `CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "userId"    TEXT NOT NULL,
      "endpoint"  TEXT NOT NULL,
      "p256dh"    TEXT NOT NULL,
      "auth"      TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    name: 'PushSubscription.endpoint unique index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint")`,
  },
];

async function run() {
  const target = tursoUrl ? tursoUrl : 'local dev.db';
  console.log(`\nRunning Phase 2 migrations against: ${target}\n`);

  for (const m of migrations) {
    try {
      await client.execute(m.sql);
      console.log(`  ✓  ${m.name}`);
    } catch (err: any) {
      // "duplicate column" / "already exists" are safe to ignore
      if (
        err?.message?.includes('duplicate column') ||
        err?.message?.includes('already exists') ||
        err?.message?.includes('table already exists')
      ) {
        console.log(`  –  ${m.name} (already exists, skipped)`);
      } else {
        console.error(`  ✗  ${m.name}: ${err?.message}`);
      }
    }
  }

  console.log('\nMigration complete.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
