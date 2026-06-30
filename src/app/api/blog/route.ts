import { NextResponse } from 'next/server';

const BLOG_URL = 'http://161.97.154.157:8099';

export async function GET() {
  try {
    // Fetch blog posts from WordPress REST API
    const res = await fetch(`${BLOG_URL}/wp-json/wp/v2/posts?per_page=6&_embed`, {
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
      const imageUrl = featuredMedia?.source_url || null;

      // Strip HTML tags from excerpt
      const excerpt = post.excerpt?.rendered
        ? post.excerpt.rendered.replace(/<[^>]*>/g, '').trim().substring(0, 150)
        : '';

      return {
        id: post.id,
        title: post.title?.rendered || 'Sin título',
        excerpt,
        link: post.link,
        imageUrl,
        date: post.date,
      };
    });

    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: 'Blog no disponible' }, { status: 502 });
  }
}
