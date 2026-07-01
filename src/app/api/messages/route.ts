import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return null;
  return password === setting.value;
}

// GET /api/messages - public (active messages only)
export async function GET() {
  try {
    const messages = await db.message.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: 'Error fetching messages' }, { status: 500 });
  }
}

// POST /api/messages - admin
export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const message = await db.message.create({ data: body });
    await db.adminLog.create({ data: { action: 'CREATE_MESSAGE', detail: body.content?.substring(0, 50) } });
    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creating message' }, { status: 500 });
  }
}

// PUT /api/messages - admin
export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, ...data } = await request.json();
    const message = await db.message.update({ where: { id }, data });
    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: 'Error updating message' }, { status: 500 });
  }
}

// DELETE /api/messages - admin
export async function DELETE(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.message.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error deleting message' }, { status: 500 });
  }
}