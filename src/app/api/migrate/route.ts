import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// One-time migration endpoint — delete after use
export async function GET() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Device (
        id TEXT PRIMARY KEY,
        deviceId TEXT NOT NULL UNIQUE,
        platform TEXT,
        userAgent TEXT,
        lastSeenAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        installedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PushSubscription (
        id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL UNIQUE,
        keysAuth TEXT NOT NULL,
        keysP256dh TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return NextResponse.json({ ok: true, message: 'Tablas Device y PushSubscription creadas' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}