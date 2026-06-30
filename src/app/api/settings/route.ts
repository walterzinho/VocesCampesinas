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

// GET /api/settings - public (only non-sensitive settings)
export async function GET() {
  try {
    const settings = await db.settings.findMany({
      where: {
        key: { not: 'adminPassword' },
      },
    });
    const obj: Record<string, string> = {};
    for (const s of settings) {
      obj[s.key] = s.value;
    }
    return NextResponse.json(obj);
  } catch {
    return NextResponse.json({ error: 'Error fetching settings' }, { status: 500 });
  }
}

// PUT /api/settings - admin (update individual setting)
export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { key, value } = await request.json();
    if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });

    const setting = await db.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await db.adminLog.create({ data: { action: 'UPDATE_SETTING', detail: `${key}=${value}` } });
    return NextResponse.json(setting);
  } catch {
    return NextResponse.json({ error: 'Error updating setting' }, { status: 500 });
  }
}