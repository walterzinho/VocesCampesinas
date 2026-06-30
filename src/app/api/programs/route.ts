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

// POST /api/programs - admin only
export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
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
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.program.delete({ where: { id } });
    await db.adminLog.create({ data: { action: 'DELETE_PROGRAM', detail: id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error deleting program' }, { status: 500 });
  }
}