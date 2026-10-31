import { PrismaClient } from '@prisma/client'
import { runMigrations } from './migrate'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Migración runtime (crea tabla Schedule y respalda horarios legacy)
// una sola vez por proceso; idempotente.
runMigrations(db)