import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '');
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting) return false;
  return password === setting.value;
}

// GET /api/videos — admin gets all, public gets only active
export async function GET(req: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(req);
    const videos = await db.video.findMany({
      where: isAdmin ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(videos);
  } catch {
    return NextResponse.json({ error: 'Error al obtener videos' }, { status: 500 });
  }
}

// POST /api/videos — admin only, create new video
export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { title, youtubeUrl, description, sortOrder } = body;

    if (!title?.trim() || !youtubeUrl?.trim()) {
      return NextResponse.json({ error: 'Título y enlace de YouTube son requeridos' }, { status: 400 });
    }

    const videoId = extractYouTubeId(youtubeUrl.trim());
    if (!videoId) {
      return NextResponse.json({ error: 'Enlace de YouTube no válido. Usa youtube.com/watch?v=..., youtu.be/..., o youtube.com/shorts/...' }, { status: 400 });
    }

    const video = await db.video.create({
      data: {
        title: title.trim(),
        youtubeUrl: videoId,
        description: description?.trim() || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    await db.adminLog.create({ data: { action: 'CREATE_VIDEO', detail: video.title } });

    return NextResponse.json(video, { status: 201 });
  } catch (err) {
    console.error('Video create error:', err);
    return NextResponse.json({ error: 'Error al crear video' }, { status: 500 });
  }
}

// PUT /api/videos — admin only, update video
export async function PUT(req: NextRequest) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
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

    const video = await db.video.update({
      where: { id },
      data: updateData,
    });

    await db.adminLog.create({ data: { action: 'UPDATE_VIDEO', detail: video.title } });

    return NextResponse.json(video);
  } catch (err) {
    console.error('Video update error:', err);
    return NextResponse.json({ error: 'Error al actualizar video' }, { status: 500 });
  }
}

// DELETE /api/videos — admin only
export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const video = await db.video.findUnique({ where: { id } });
    await db.video.delete({ where: { id } });
    await db.adminLog.create({ data: { action: 'DELETE_VIDEO', detail: video?.title || id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Video delete error:', err);
    return NextResponse.json({ error: 'Error al eliminar video' }, { status: 500 });
  }
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  // Already just an ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  let match: RegExpMatchArray | null;

  // youtube.com/watch?v=ID (with extra params)
  match = url.match(/(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
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

  // youtube.com/live/ID
  match = url.match(/(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  return null;
}