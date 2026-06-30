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

// POST /api/requests - public (submit song request/greeting)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listenerName, message, type } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 });
    }

    const songRequest = await db.songRequest.create({
      data: {
        listenerName: listenerName || null,
        message: message.trim(),
        type: type || 'request',
      },
    });

    return NextResponse.json({ success: true, id: songRequest.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al enviar' }, { status: 500 });
  }
}

// GET /api/requests - admin only (list all requests)
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const requests = await db.songRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: 'Error fetching requests' }, { status: 500 });
  }
}

// PUT /api/requests - admin (mark as read)
export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, isRead } = await request.json();
    const updated = await db.songRequest.update({
      where: { id },
      data: { isRead: isRead ?? true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error updating request' }, { status: 500 });
  }
}

// DELETE /api/requests - admin
export async function DELETE(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.songRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error deleting request' }, { status: 500 });
  }
}
