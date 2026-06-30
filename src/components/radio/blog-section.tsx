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
          <div key={i} className="animate-pulse rounded-2xl bg-white/5 overflow-hidden">
            <div className="flex">
              <div className="w-28 h-28 bg-white/10 shrink-0" />
              <div className="flex-1 p-3 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
                <div className="h-3 bg-white/5 rounded w-1/3 mt-3" />
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
      <div className="flex items-center justify-between px-1 mb-1">
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

      {/* Articles - large visual cards with 1:1 image left */}
      {articles.map((article, idx) => (
        <motion.a
          key={article.id}
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06 }}
          className="block rounded-2xl bg-white/5 border border-white/[0.08] overflow-hidden hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex">
            {/* Image - 1:1 square, prominent */}
            <div className="shrink-0 w-28 h-28 relative bg-white/[0.03]">
              {article.imageUrl ? (
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Hide image on error, show fallback
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F4D03F]/10 to-[#F4D03F]/5';
                      fallback.innerHTML = '<svg class="w-6 h-6 text-[#F4D03F]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F4D03F]/10 to-[#F4D03F]/5">
                  <ImageOff className="w-5 h-5 text-[#F4D03F]/30" />
                </div>
              )}
              {/* Category accent line */}
              <div className="absolute top-0 left-0 w-1 h-full bg-[#F4D03F]/60 rounded-r" />
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
              <div>
                <h4 className="text-[13px] font-bold text-white line-clamp-2 leading-snug">
                  {article.title}
                </h4>
                {article.excerpt && (
                  <p className="text-[11px] text-white/35 mt-1.5 line-clamp-2 leading-relaxed">
                    {article.excerpt}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Calendar className="w-3 h-3 text-white/20" />
                <span className="text-[10px] text-white/25">
                  {new Date(article.date).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <ExternalLink className="w-3 h-3 text-white/15 ml-auto" />
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}