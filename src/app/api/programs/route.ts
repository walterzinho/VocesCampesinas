import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper to verify admin
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return null;
  return password === setting.value;
}

// GET /api/programs - public
export async function GET() {
  try {
    const today = new Date().getDay();
    const programs = await db.program.findMany({
      where: { isActive: true, dayOfWeek: today },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(programs);
  } catch {
    return NextResponse.json({ error: 'Error fetching programs' }, { status: 500 });
  }
}

// POST /api/programs - admin only (single or batch)
export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Batch mode: create program for multiple days
    if (body.days && Array.isArray(body.days) && body.days.length > 0) {
      const { days, ...baseData } = body;
      const results = [];
      for (const day of days) {
        const program = await db.program.create({
          data: { ...baseData, dayOfWeek: day },
        });
        results.push(program);
      }
      await db.adminLog.create({
        data: {
          action: 'CREATE_PROGRAM_BATCH',
          detail: `${body.name} x${days.length} días [${days.join(',')}]`,
        },
      });
      return NextResponse.json(results, { status: 201 });
    }

    // Single mode
    const program = await db.program.create({ data: body });
    await db.adminLog.create({ data: { action: 'CREATE_PROGRAM', detail: program.name } });
    return NextResponse.json(program, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creating program' }, { status: 500 });
  }
}

// PUT /api/programs - admin only
export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, ...data } = await request.json();

    // Batch update: update all days for a program name
    if (data.batchUpdateName && data.days) {
      const { batchUpdateName, days, ...baseData } = data;
      // Delete old entries for this program name on selected days
      if (days.length > 0) {
        await db.program.deleteMany({
          where: {
            name: batchUpdateName,
            dayOfWeek: { in: days },
          },
        });
      }
      // Create new entries
      const results = [];
      for (const day of days) {
        const program = await db.program.create({
          data: { ...baseData, dayOfWeek: day },
        });
        results.push(program);
      }
      await db.adminLog.create({
        data: { action: 'UPDATE_PROGRAM_BATCH', detail: `${baseData.name} x${days.length} días` },
      });
      return NextResponse.json(results);
    }

    // Single update
    const program = await db.program.update({ where: { id }, data });
    await db.adminLog.create({ data: { action: 'UPDATE_PROGRAM', detail: program.name } });
    return NextResponse.json(program);
  } catch {
    return NextResponse.json({ error: 'Error updating program' }, { status: 500 });
  }
}

// DELETE /api/programs - admin only
export async function DELETE(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (name) {
      // Delete all entries with this name (multi-day deletion)
      await db.program.deleteMany({ where: { name } });
      await db.adminLog.create({ data: { action: 'DELETE_PROGRAM_BATCH', detail: name } });
    } else if (id) {
      await db.program.delete({ where: { id } });
      await db.adminLog.create({ data: { action: 'DELETE_PROGRAM', detail: id } });
    } else {
      return NextResponse.json({ error: 'ID or name required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error deleting program' }, { status: 500 });
  }
}