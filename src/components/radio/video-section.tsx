'use client';

import { useEffect, useState } from 'react';
import { Play, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface Video {
  id: string;
  title: string;
  youtubeUrl: string; // stored as video ID
  description: string | null;
  createdAt: string;
}

function getThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default function VideoSection() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/videos');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data)) setVideos(data);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 300000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 mb-4">
        <div className="animate-pulse h-4 bg-app-surface rounded w-32 mb-2" />
        <div className="animate-pulse h-48 bg-app-surface rounded-2xl" />
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <Play className="w-4 h-4 text-red-500" />
        <h3 className="text-sm font-bold text-app-text">Videos</h3>
      </div>

      <div className="space-y-3">
        {videos.map((video, idx) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="rounded-2xl bg-app-surface border border-app-bdr overflow-hidden"
          >
            {/* Video / Thumbnail */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              {playingId === video.id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeUrl}?autoplay=1&rel=0`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={video.title}
                />
              ) : (
                <button
                  onClick={() => setPlayingId(video.id)}
                  className="absolute inset-0 w-full h-full group cursor-pointer"
                >
                  <img
                    src={getThumbnailUrl(video.youtubeUrl)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        e.currentTarget.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'absolute inset-0 flex items-center justify-center bg-app-surface';
                        fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-tdim"><line x1="2" y1="2" x2="22" y2="22"/><path d="m9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Video info */}
            <div className="px-3 py-2.5">
              <h4 className="text-[13px] font-semibold text-app-text line-clamp-2 leading-snug">{video.title}</h4>
              {video.description && (
                <p className="text-[11px] text-app-t3 mt-1 line-clamp-2 leading-relaxed">{video.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}