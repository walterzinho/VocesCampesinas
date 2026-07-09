import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return false;
  return password === setting.value;
}

// GET - count subscribers (admin)
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const count = await db.pushSubscription.count();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return NextResponse.json({ error: 'Datos de suscripción incompletos' }, { status: 400 });
    }

    // Upsert by endpoint
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        keysAuth: keys.auth,
        keysP256dh: keys.p256dh,
      },
      update: {
        keysAuth: keys.auth,
        keysP256dh: keys.p256dh,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error guardando suscripción push:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 });
    }

    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando suscripción push:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}