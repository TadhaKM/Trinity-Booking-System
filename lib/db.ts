import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  console.log('[DB] TURSO_DATABASE_URL set:', !!tursoUrl);
  console.log('[DB] TURSO_AUTH_TOKEN set:', !!tursoToken);
  console.log('[DB] NODE_ENV:', process.env.NODE_ENV);

  // Use Turso when env vars are set
  if (tursoUrl && tursoToken) {
    console.log('[DB] Connecting to Turso:', tursoUrl);
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter } as any);
  }

  // Use local SQLite for development
  console.log('[DB] Falling back to local SQLite');
  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
