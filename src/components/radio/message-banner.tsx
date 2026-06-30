'use client';

import { useEffect, useState, useRef } from 'react';
import { Info, AlertTriangle, Megaphone, Newspaper, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  type: string;
  priority: number;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; gradient: string; label: string }> = {
  info: {
    icon: Newspaper,
    color: 'text-sky-300',
    bg: 'bg-gradient-to-r from-sky-500/15 to-sky-500/5',
    border: 'border-sky-500/25',
    gradient: 'from-sky-500/20 to-transparent',
    label: 'INFO',
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-amber-300',
    bg: 'bg-gradient-to-r from-amber-500/15 to-amber-500/5',
    border: 'border-amber-500/25',
    gradient: 'from-amber-500/20 to-transparent',
    label: 'ALERTA',
  },
  promotion: {
    icon: Megaphone,
    color: 'text-[#F4D03F]',
    bg: 'bg-gradient-to-r from-[#F4D03F]/15 to-[#F4D03F]/5',
    border: 'border-[#F4D03F]/25',
    gradient: 'from-[#F4D03F]/20 to-transparent',
    label: 'PROMO',
  },
};

export default function MessageBanner() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok && !cancelled) {
          setMessages(await res.json());
        }
      } catch { /* ignore */ }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const visibleMessages = messages.filter(m => !dismissed.has(m.id));

  useEffect(() => {
    if (visibleMessages.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % visibleMessages.length);
    }, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visibleMessages.length]);

  if (visibleMessages.length === 0) return null;

  const msg = visibleMessages[currentIdx % visibleMessages.length];
  const config = TYPE_CONFIG[msg.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  const goNext = () => setCurrentIdx(prev => (prev + 1) % visibleMessages.length);
  const goPrev = () => setCurrentIdx(prev => (prev - 1 + visibleMessages.length) % visibleMessages.length);

  return (
    <div className="w-full">
      {/* Section label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Información</span>
          <span className="w-1 h-1 rounded-full bg-[#F4D03F]/40" />
        </div>
        {visibleMessages.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="p-0.5 rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-3 h-3 text-white/30" />
            </button>
            <button onClick={goNext} className="p-0.5 rounded-full hover:bg-white/10 transition-colors">
              <ChevronRight className="w-3 h-3 text-white/30" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`relative overflow-hidden rounded-2xl border ${config.bg} ${config.border}`}
        >
          {/* Decorative gradient accent */}
          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${config.gradient}`} />

          <div className="flex items-start gap-3 p-3.5 pl-4">
            <div className={`shrink-0 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mt-0.5`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
                {msg.priority > 5 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">
                    IMPORTANTE
                  </span>
                )}
              </div>
              <p className={`text-xs leading-relaxed ${config.color}`}>
                {msg.content}
              </p>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(msg.id))}
              className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors mt-0.5"
              aria-label="Cerrar mensaje"
            >
              <X className="w-3 h-3 text-white/20" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      {visibleMessages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {visibleMessages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIdx % visibleMessages.length
                  ? 'bg-[#F4D03F] w-5'
                  : 'bg-white/15 w-1.5 hover:bg-white/25'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
