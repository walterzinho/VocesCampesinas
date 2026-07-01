import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/videos — public, returns active videos sorted by sortOrder
export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        youtubeUrl: true,
        description: true,
        createdAt: true,
      },
    });
    return NextResponse.json(videos);
  } catch {
    return NextResponse.json({ error: 'Error al obtener videos' }, { status: 500 });
  }
}

// POST /api/videos — admin only, create new video
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD || 'admin123'}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { title, youtubeUrl, description, sortOrder } = body;

    if (!title?.trim() || !youtubeUrl?.trim()) {
      return NextResponse.json({ error: 'Título y enlace de YouTube son requeridos' }, { status: 400 });
    }

    // Extract video ID from various YouTube URL formats
    const videoId = extractYouTubeId(youtubeUrl.trim());
    if (!videoId) {
      return NextResponse.json({ error: 'Enlace de YouTube no válido' }, { status: 400 });
    }

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        youtubeUrl: videoId,
        description: description?.trim() || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear video' }, { status: 500 });
  }
}

// PUT /api/videos — admin only, update video
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD || 'admin123'}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, youtubeUrl, description, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (youtubeUrl !== undefined) {
      const videoId = extractYouTubeId(youtubeUrl.trim());
      if (!videoId) return NextResponse.json({ error: 'Enlace de YouTube no válido' }, { status: 400 });
      updateData.youtubeUrl = videoId;
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const video = await prisma.video.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(video);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar video' }, { status: 500 });
  }
}

// DELETE /api/videos — admin only
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD || 'admin123'}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.video.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar video' }, { status: 500 });
  }
}

// Helper: extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  // If it's already just an ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  let match: RegExpMatchArray | null;

  // youtube.com/watch?v=ID
  match = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // youtu.be/ID
  match = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // youtube.com/embed/ID
  match = url.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // youtube.com/shorts/ID
  match = url.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  return null;
}