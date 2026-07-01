'use client';

import { useEffect, useState, useRef } from 'react';
import { Info, AlertTriangle, Megaphone, X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  type: string;
  imageUrl?: string | null;
  priority: number;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; border: string; accent: string; label: string }> = {
  info: { icon: Info, color: 'text-sky-300', border: 'border-sky-500/20', accent: 'bg-sky-500/60', label: 'INFO' },
  alert: { icon: AlertTriangle, color: 'text-amber-300', border: 'border-amber-500/20', accent: 'bg-amber-500/60', label: 'ALERTA' },
  promotion: { icon: Megaphone, color: 'text-[#F4D03F]', border: 'border-[#F4D03F]/20', accent: 'bg-[#F4D03F]/60', label: 'PROMO' },
};

export default function MessageBanner() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try { const res = await fetch('/api/messages'); if (res.ok && !cancelled) setMessages(await res.json()); } catch { /* */ }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const visibleMessages = messages.filter(m => !dismissed.has(m.id));

  useEffect(() => {
    if (visibleMessages.length <= 1) return;
    intervalRef.current = setInterval(() => setCurrentIdx(prev => (prev + 1) % visibleMessages.length), 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [visibleMessages.length]);

  if (visibleMessages.length === 0) return null;

  const msg = visibleMessages[currentIdx % visibleMessages.length];
  const config = TYPE_CONFIG[msg.type] || TYPE_CONFIG.info;
  const Icon = config.icon;
  const goNext = () => setCurrentIdx(prev => (prev + 1) % visibleMessages.length);
  const goPrev = () => setCurrentIdx(prev => (prev - 1 + visibleMessages.length) % visibleMessages.length);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-app-t3 uppercase tracking-wider">Información</span>
          <span className="w-1 h-1 rounded-full bg-[#F4D03F]/40" />
        </div>
        {visibleMessages.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="p-0.5 rounded-full hover:bg-app-surface-h transition-colors"><ChevronLeft className="w-3 h-3 text-app-tdim" /></button>
            <span className="text-[9px] text-app-tdim tabular-nums">{currentIdx % visibleMessages.length + 1}/{visibleMessages.length}</span>
            <button onClick={goNext} className="p-0.5 rounded-full hover:bg-app-surface-h transition-colors"><ChevronRight className="w-3 h-3 text-app-tdim" /></button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={msg.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className={`relative overflow-hidden rounded-2xl border ${config.border} bg-app-surface group active:scale-[0.98] transition-transform duration-150`}>
          <div className="flex">
            {msg.imageUrl ? (
              <div className="shrink-0 w-28 h-28 relative bg-app-surface">
                <img src={msg.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div className={`absolute top-0 left-0 w-1 h-full ${config.accent} rounded-r`} />
              </div>
            ) : (
              <div className="shrink-0 w-28 h-28 relative bg-app-surface flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-bdr flex items-center justify-center"><Icon className={`w-5 h-5 ${config.color}`} /></div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${config.color} opacity-60`}>{config.label}</span>
                </div>
                <div className={`absolute top-0 left-0 w-1 h-full ${config.accent} rounded-r`} />
              </div>
            )}
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {!msg.imageUrl && <Icon className={`w-3 h-3 ${config.color} opacity-50`} />}
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
                  {msg.priority > 5 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">IMPORTANTE</span>}
                </div>
                <p className="text-xs leading-relaxed text-app-t2 line-clamp-3">{msg.content}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setDismissed(prev => new Set(prev).add(msg.id))} className="absolute top-2 right-2 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors" aria-label="Cerrar mensaje">
            <X className="w-3 h-3 text-white/40" />
          </button>
        </motion.div>
      </AnimatePresence>

      {visibleMessages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {visibleMessages.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentIdx(idx)} className={`h-1 rounded-full transition-all duration-300 ${idx === currentIdx % visibleMessages.length ? 'bg-[#F4D03F] w-5' : 'bg-app-tdim w-1.5'}`} />
          ))}
        </div>
      )}
    </div>
  );
}