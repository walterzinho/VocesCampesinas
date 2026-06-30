import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Read blog URL from settings (configurable by admin)
    const blogSetting = await db.settings.findUnique({ where: { key: 'blogUrl' } });
    const blogUrl = blogSetting?.value || 'http://161.97.154.157:8099';

    // Fetch blog posts from WordPress REST API
    const res = await fetch(`${blogUrl}/wp-json/wp/v2/posts?per_page=6&_embed`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Blog no disponible' }, { status: 502 });
    }

    const posts = await res.json();

    // Transform to a simplified format
    const articles = posts.map((post: any) => {
      const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
      const rawImageUrl = featuredMedia?.source_url || null;

      // Proxy image through our server to avoid CORS/mixed-content issues
      const imageUrl = rawImageUrl
        ? `/api/blog/image?url=${encodeURIComponent(rawImageUrl)}`
        : null;

      // Strip HTML tags from excerpt
      const excerpt = post.excerpt?.rendered
        ? post.excerpt.rendered.replace(/<[^>]*>/g, '').trim().substring(0, 200)
        : '';

      return {
        id: post.id,
        title: post.title?.rendered || 'Sin título',
        excerpt,
        link: post.link,
        imageUrl,
        date: post.date,
        blogUrl,
      };
    });

    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: 'Blog no disponible' }, { status: 502 });
  }
}
