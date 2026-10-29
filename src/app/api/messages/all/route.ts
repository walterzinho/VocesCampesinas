import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/messages/all - admin gets all messages
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const messages = await db.message.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}