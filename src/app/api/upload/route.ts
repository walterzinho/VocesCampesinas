import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

async function verifyAdmin(request: NextRequest) {
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const field = (formData.get('field') as string) || 'general';

    if (!file) return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return NextResponse.json({ error: 'La imagen es muy grande (máximo 5MB)' }, { status: 400 });

    if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true });

    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `${field}-${timestamp}-${randomStr}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(UPLOADS_DIR, filename);
    await writeFile(filePath, buffer);

    await db.adminLog.create({ data: { action: 'UPLOAD_IMAGE', detail: `${field}: ${filename}` } });

    const url = `/api/uploads/${filename}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}