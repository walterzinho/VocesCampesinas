import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const setting = await db.settings.findUnique({ where: { key: 'vapidPublicKey' } });
    if (!setting?.value) {
      return NextResponse.json({ key: null, configured: false });
    }
    return NextResponse.json({ key: setting.value, configured: true });
  } catch {
    return NextResponse.json({ key: null, configured: false });
  }
}