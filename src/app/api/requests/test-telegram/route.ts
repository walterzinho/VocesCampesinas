import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';

// POST /api/requests/test-telegram - admin (test notification)
export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sent = await sendTelegramNotification({
    text: '✅ <b>Notificaciones de Telegram activadas</b>\n\nVoces Campesinas - Prueba exitosa. Ahora recibirás las peticiones, saludos y dedicaciones aquí.',
  });

  if (sent) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json(
      { error: 'No se pudo enviar. Verifica el Token del Bot y el Chat ID.' },
      { status: 400 }
    );
  }
}