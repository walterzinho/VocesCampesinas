import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return false;
  return password === setting.value;
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, body: message, url } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Título y mensaje son requeridos' }, { status: 400 });
    }

    // Get VAPID keys from settings
    const [vapidPublic, vapidPrivate, vapidSubject] = await Promise.all([
      db.settings.findUnique({ where: { key: 'vapidPublicKey' } }),
      db.settings.findUnique({ where: { key: 'vapidPrivateKey' } }),
      db.settings.findUnique({ where: { key: 'vapidSubject' } }),
    ]);

    if (!vapidPublic?.value || !vapidPrivate?.value) {
      return NextResponse.json({ error: 'Llaves VAPID no configuradas. Genera las llaves primero en Config.' }, { status: 400 });
    }

    webpush.setVapidDetails(
      vapidSubject?.value || 'mailto:admin@vocescampesinas.co',
      vapidPublic.value,
      vapidPrivate.value,
    );

    const subscriptions = await db.pushSubscription.findMany();
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'No hay suscriptores', sent: 0, total: 0 });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: url || '/',
    });

    let sent = 0;
    let failed = 0;
    const failedEndpoints: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                auth: sub.keysAuth,
                p256dh: sub.keysP256dh,
              },
            },
            payload,
            { TTL: 86400 }, // 24 hours
          );
          sent++;
        } catch (error: any) {
          failed++;
          // If subscription is invalid/expired, delete it
          if (error.statusCode === 404 || error.statusCode === 410) {
            failedEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      await db.pushSubscription.deleteMany({
        where: { endpoint: { in: failedEndpoints } },
      });
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      cleaned: failedEndpoints.length,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Error enviando push:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}