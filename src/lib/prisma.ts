import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient; dbMigrated?: boolean };

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoAuthToken) {
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Ensures schema columns and tables exist in production Turso SQLite database
 * without needing manual migration runs.
 */
export async function ensureDatabaseSchema() {
  if (globalForPrisma.dbMigrated) return;
  globalForPrisma.dbMigrated = true;

  const statements = [
    `CREATE TABLE IF NOT EXISTS "AppSetting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    'ALTER TABLE Recipe ADD COLUMN caloriesPerServing REAL;',
    'ALTER TABLE Recipe ADD COLUMN proteinGrams REAL;',
    'ALTER TABLE Recipe ADD COLUMN carbsGrams REAL;',
    'ALTER TABLE Recipe ADD COLUMN fatGrams REAL;',
    'ALTER TABLE Recipe ADD COLUMN fiberGrams REAL;',
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // Column/Table already exists or syntax not needed, ignore safely
    }
  }
}
