import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const vapidKeys = webpush.generateVAPIDKeys();

    // Save to settings
    await Promise.all([
      db.settings.upsert({
        where: { key: 'vapidPublicKey' },
        create: { key: 'vapidPublicKey', value: vapidKeys.publicKey },
        update: { value: vapidKeys.publicKey },
      }),
      db.settings.upsert({
        where: { key: 'vapidPrivateKey' },
        create: { key: 'vapidPrivateKey', value: vapidKeys.privateKey },
        update: { value: vapidKeys.privateKey },
      }),
      db.settings.upsert({
        where: { key: 'vapidSubject' },
        create: { key: 'vapidSubject', value: 'mailto:admin@vocescampesinas.co' },
        update: { value: 'mailto:admin@vocescampesinas.co' },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      publicKey: vapidKeys.publicKey,
      message: 'Llaves VAPID generadas exitosamente',
    });
  } catch (error) {
    console.error('Error generando VAPID keys:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}