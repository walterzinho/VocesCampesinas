import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // Only allow proxying from the configured blog domain(s)
  try {
    const parsed = new URL(url);
    const blogSetting = await (await import('@/lib/db')).db.settings.findUnique({ where: { key: 'blogUrl' } });
    const allowedOrigin = blogSetting?.value || 'http://161.97.154.157:8099';
    const allowed = new URL(allowedOrigin);
    if (parsed.hostname !== allowed.hostname) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'VocesCampesinas/1.0',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}