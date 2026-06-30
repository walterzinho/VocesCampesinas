'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Calendar } from 'lucide-react';
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
          if (Array.isArray(data) && data.length > 0) {
            setArticles(data);
          } else {
            setError(true);
          }
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
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
          <div key={i} className="animate-pulse rounded-2xl bg-white/5 p-4">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-2 bg-white/5 rounded w-full" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || articles.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#F4D03F]" />
          <h3 className="text-sm font-bold text-white">Noticias Destacadas</h3>
        </div>
        {blogBaseUrl && (
          <a
            href={blogBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#F4D03F]/60 hover:text-[#F4D03F] flex items-center gap-0.5 transition-colors"
          >
            Ver todas <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Articles */}
      {articles.map((article, idx) => (
        <motion.a
          key={article.id}
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="block rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex gap-3 p-3">
            {article.imageUrl && (
              <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-white/5">
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight">{article.title}</h4>
              {article.excerpt && (
                <p className="text-[10px] text-white/35 mt-1 line-clamp-2 leading-relaxed">{article.excerpt}</p>
              )}
              <div className="flex items-center gap-1 mt-1.5">
                <Calendar className="w-2.5 h-2.5 text-white/20" />
                <span className="text-[9px] text-white/20">
                  {new Date(article.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}
