import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/programs/all - all programs for admin
export async function GET() {
  try {
    const programs = await db.program.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { sortOrder: 'asc' }],
    });
    return NextResponse.json(programs);
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}