import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordAgainstDb, verifyAdmin } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// POST /api/admin - login
// Ahora con rate limiting (5 intentos / 15 min por IP) y registro de intentos fallidos.
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      await db.adminLog
        .create({
          data: {
            action: 'LOGIN_BLOCKED',
            detail: `Rate limit alcanzado desde ${ip}`,
          },
        })
        .catch(() => {});
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${rl.retryAfterSec} segundos.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    // El login envía la contraseña en el body JSON (no en el header Bearer)
    if (await verifyPasswordAgainstDb(password)) {
      await db.adminLog.create({ data: { action: 'LOGIN', detail: 'Successful login' } });
      return NextResponse.json({ success: true, token: password });
    }

    await db.adminLog
      .create({ data: { action: 'LOGIN_FAILED', detail: `Intento fallido desde ${ip}` } })
      .catch(() => {});

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Login error' }, { status: 500 });
  }
}

// GET /api/admin - logs (admin only)
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await db.adminLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: 'Error fetching logs' }, { status: 500 });
  }
}
