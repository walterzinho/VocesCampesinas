import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, hashPassword } from '@/lib/auth';

/**
 * Claves que el endpoint público SÍ puede devolver.
 * Todo lo que no esté aquí (telegramBotToken, telegramChatId,
 * vapidPrivateKey, adminPassword...) nunca sale por la API pública.
 */
const PUBLIC_KEYS = [
  // Identidad y reproductor
  'streamUrl',
  'stationName',
  'stationSlogan',
  'offAirName',
  'offAirSlogan',
  'offAirImageUrl',
  // Colores del tema
  'primaryColor',
  'darkColor',
  // Redes sociales
  'facebookUrl',
  'instagramUrl',
  'whatsappUrl',
  'youtubeUrl',
  'tiktokUrl',
  'xUrl',
  // Blog de noticias
  'blogUrl',
  // Solo la clave PÚBLICA VAPID (la privada jamás)
  'vapidPublicKey',
];

// GET /api/settings
//  - Sin credenciales: solo claves públicas (lista blanca)
//  - Con Bearer de admin válido: todas las configuraciones
//    (el panel admin llama con authHeader(), así que sigue viendo todo)
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    const settings = await db.settings.findMany({
      where: isAdmin ? {} : { key: { in: PUBLIC_KEYS } },
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
    if (!key || typeof value !== 'string') {
      return NextResponse.json({ error: 'Key y value son requeridos' }, { status: 400 });
    }

    // La contraseña admin NUNCA se guarda en texto plano
    const storedValue = key === 'adminPassword' ? hashPassword(value) : value;

    const setting = await db.settings.upsert({
      where: { key },
      update: { value: storedValue },
      create: { key, value: storedValue },
    });

    await db.adminLog.create({
      data: {
        action: 'UPDATE_SETTING',
        detail:
          key === 'adminPassword' ? 'adminPassword=***actualizada***' : `${key}=${value}`,
      },
    });
    return NextResponse.json(setting);
  } catch {
    return NextResponse.json({ error: 'Error updating setting' }, { status: 500 });
  }
}
