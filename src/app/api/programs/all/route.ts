import { db } from '@/lib/db';
import { runMigrations } from '@/lib/migrate';
import { NextResponse } from 'next/server';

// GET /api/programs/all - todos los programas con sus horarios (público)
export async function GET() {
  try {
    await runMigrations(db);
    const programs = await db.program.findMany({
      include: {
        schedules: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }, { sortOrder: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(programs);
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
