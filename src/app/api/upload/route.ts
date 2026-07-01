import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return null;
  return password === setting.value;
}

// POST /api/upload - admin only
export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Archivo muy grande (máximo 5MB, recibido ${Math.round(file.size / 1024)}KB)` }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo no permitido: ${file.type}. Usa JPG, PNG, GIF o WebP` }, { status: 400 });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Sanitize filename: slugify the original name
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safeName = originalName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) || 'image';
    const fileName = `${safeName}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${fileName}`,
      fileName,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Error al guardar el archivo' }, { status: 500 });
  }
}