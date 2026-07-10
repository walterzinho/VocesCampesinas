import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Verify admin via Bearer token
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '');
  // Dynamic import to avoid circular deps at build time
  const { db } = await import('@/lib/db');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return false;
  return password === setting.value;
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen excede 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al subir' }, { status: 500 });
  }
}