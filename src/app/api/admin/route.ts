import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
    if (!setting) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
    }

    if (password === setting.value) {
      await db.adminLog.create({ data: { action: 'LOGIN', detail: 'Successful login' } });
      return NextResponse.json({ success: true, token: password });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Login error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting || password !== setting.value) {
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