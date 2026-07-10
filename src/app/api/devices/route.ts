import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function detectPlatform(ua: string): string {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/windows/i.test(ua)) return 'windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  return 'other';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'deviceId requerido' }, { status: 400 });
    }

    const ua = request.headers.get('user-agent') || '';
    const platform = detectPlatform(ua);

    // Upsert: create if new, update lastSeenAt if exists
    const device = await db.device.upsert({
      where: { deviceId },
      create: {
        deviceId,
        platform,
        userAgent: ua.length > 200 ? ua.substring(0, 200) : ua,
      },
      update: {
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, device: { id: device.id, installedAt: device.installedAt } });
  } catch (error) {
    console.error('Error registrando dispositivo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return false;
  return password === setting.value;
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const devices = await db.device.findMany({
      orderBy: { lastSeenAt: 'desc' },
    });
    const total = devices.length;

    const platformCounts: Record<string, number> = {};
    for (const d of devices) {
      const p = d.platform || 'other';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }

    return NextResponse.json({ devices, total, platformCounts });
  } catch (error) {
    console.error('Error consultando dispositivos:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}