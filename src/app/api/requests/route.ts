import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';
import { verifyAdmin } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const VALID_TYPES = ['request', 'greeting', 'dedication'];
const MAX_MESSAGE_LEN = 500;
const MAX_NAME_LEN = 80;

// POST /api/requests - public (submit song request/greeting)
// Con rate limiting (5 envíos / 10 min por IP) para evitar spam
// al Telegram del administrador y a la base de datos.
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`request:${ip}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Has enviado varios mensajes seguidos. Espera ${rl.retryAfterSec} segundos.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const { listenerName, message, type } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json(
        { error: `El mensaje no puede superar ${MAX_MESSAGE_LEN} caracteres` },
        { status: 400 }
      );
    }
    if (listenerName && (typeof listenerName !== 'string' || listenerName.length > MAX_NAME_LEN)) {
      return NextResponse.json(
        { error: `El nombre no puede superar ${MAX_NAME_LEN} caracteres` },
        { status: 400 }
      );
    }
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipo de mensaje inválido' }, { status: 400 });
    }

    const songRequest = await db.songRequest.create({
      data: {
        listenerName: listenerName || null,
        message: message.trim(),
        type: type || 'request',
      },
    });

    // Send Telegram notification (fire-and-forget, don't block response)
    const typeLabels: Record<string, string> = {
      request: 'Petición de canción',
      greeting: 'Saludo',
      dedication: 'Dedicación',
    };
    const label = typeLabels[type || 'request'] || 'Mensaje';
    const namePart = listenerName ? `<b>De:</b> ${listenerName}\n` : '';
    const time = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    sendTelegramNotification({
      text: `🔔 <b>${label}</b>\n\n${namePart}<b>Mensaje:</b> ${message.trim()}\n\n🕐 ${time}`,
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
