'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Calendar, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  link: string;
  imageUrl: string | null;
  date: string;
  blogUrl?: string;
}

export default function BlogSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/blog');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setArticles(data);
          else setError(true);
        } else if (!cancelled) setError(true);
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 300000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const blogBaseUrl = articles.length > 0 && articles[0].blogUrl ? articles[0].blogUrl : null;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-2xl bg-app-surface overflow-hidden">
            <div className="flex"><div className="w-28 h-28 bg-app-surface-h shrink-0" /><div className="flex-1 p-3 space-y-2"><div className="h-4 bg-app-surface-h rounded w-3/4" /><div className="h-3 bg-app-surface rounded w-full" /><div className="h-3 bg-app-surface rounded w-2/3" /></div></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || articles.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#F4D03F]" />
          <h3 className="text-sm font-bold text-app-text">Noticias Destacadas</h3>
        </div>
        {blogBaseUrl && (
          <a href={blogBaseUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#F4D03F]/60 hover:text-[#F4D03F] flex items-center gap-0.5 transition-colors">
            Ver todas <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {articles.map((article, idx) => (
        <motion.a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }} className="block rounded-2xl bg-app-surface border border-app-bdr overflow-hidden hover:bg-app-surface-h hover:border-app-bdr transition-all duration-200 active:scale-[0.98]">
          <div className="flex">
            <div className="shrink-0 w-28 h-28 relative bg-app-surface">
              {article.imageUrl ? (
                <img src={article.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-app-surface"><ImageOff className="w-5 h-5 text-app-tdim" /></div>
              )}
              <div className="absolute top-0 left-0 w-1 h-full bg-[#F4D03F]/60 rounded-r" />
            </div>
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
              <div>
                <h4 className="text-[13px] font-bold text-app-text line-clamp-2 leading-snug">{article.title}</h4>
                {article.excerpt && <p className="text-[11px] text-app-t3 mt-1.5 line-clamp-2 leading-relaxed">{article.excerpt}</p>}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Calendar className="w-3 h-3 text-app-tdim" />
                <span className="text-[10px] text-app-tdim">{new Date(article.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <ExternalLink className="w-3 h-3 text-app-tdim ml-auto" />
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}