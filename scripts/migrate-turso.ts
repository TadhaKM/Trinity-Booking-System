/**
 * One-off Turso migration script.
 * Run with: npx ts-node scripts/migrate-turso.ts
 *
 * Adds the Notification, WaitlistEntry, SavedEvent, and CheckInLog tables,
 * and the policy / faqJson columns to Event.
 * Uses IF NOT EXISTS guards so it is safe to run multiple times.
 */

import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({ url, authToken });

const migrations: string[] = [
  // Add optional columns to Event
  `ALTER TABLE Event ADD COLUMN policy TEXT`,
  `ALTER TABLE Event ADD COLUMN faqJson TEXT`,

  // Notification table
  `CREATE TABLE IF NOT EXISTS Notification (
    id        TEXT    PRIMARY KEY,
    userId    TEXT    NOT NULL,
    type      TEXT    NOT NULL,
    title     TEXT    NOT NULL,
    body      TEXT    NOT NULL,
    link      TEXT,
    read      INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,

  // WaitlistEntry table
  `CREATE TABLE IF NOT EXISTS WaitlistEntry (
    id           TEXT    PRIMARY KEY,
    userId       TEXT    NOT NULL,
    ticketTypeId TEXT    NOT NULL,
    eventId      TEXT    NOT NULL,
    position     INTEGER NOT NULL,
    notified     INTEGER NOT NULL DEFAULT 0,
    createdAt    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId)       REFERENCES User(id)       ON DELETE CASCADE,
    FOREIGN KEY (ticketTypeId) REFERENCES TicketType(id) ON DELETE CASCADE,
    FOREIGN KEY (eventId)      REFERENCES Event(id)      ON DELETE CASCADE,
    UNIQUE(userId, ticketTypeId)
  )`,

  // SavedEvent table
  `CREATE TABLE IF NOT EXISTS SavedEvent (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    eventId   TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId)  REFERENCES User(id)  ON DELETE CASCADE,
    FOREIGN KEY (eventId) REFERENCES Event(id) ON DELETE CASCADE,
    UNIQUE(userId, eventId)
  )`,

  // CheckInLog table
  `CREATE TABLE IF NOT EXISTS CheckInLog (
    id        TEXT PRIMARY KEY,
    ticketId  TEXT NOT NULL UNIQUE,
    eventId   TEXT NOT NULL,
    scannedBy TEXT NOT NULL,
    scannedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (ticketId) REFERENCES Ticket(id),
    FOREIGN KEY (eventId)  REFERENCES Event(id)
  )`,

  // Indexes for common queries
  `CREATE INDEX IF NOT EXISTS idx_notification_userId   ON Notification(userId, createdAt DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_waitlist_ticketTypeId ON WaitlistEntry(ticketTypeId, position)`,
  `CREATE INDEX IF NOT EXISTS idx_savedEvent_userId     ON SavedEvent(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_checkInLog_eventId    ON CheckInLog(eventId)`,
];

async function run() {
  console.log('Running Turso migrations...\n');
  for (const sql of migrations) {
    const label = sql.slice(0, 60).replace(/\n/g, ' ').trim();
    try {
      await client.execute(sql);
      console.log(`  ✓ ${label}...`);
    } catch (err: any) {
      // "duplicate column name" is fine — column already exists
      if (err.message?.includes('duplicate column name') || err.message?.includes('already exists')) {
        console.log(`  ~ ${label}... (already exists, skipped)`);
      } else {
        console.error(`  ✗ ${label}...`);
        console.error('    ', err.message);
      }
    }
  }
  console.log('\nMigrations complete.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
