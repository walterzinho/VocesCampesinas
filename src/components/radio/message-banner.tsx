'use client';

import { useEffect, useState, useRef } from 'react';
import { Info, AlertTriangle, Megaphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  type: string;
  priority: number;
}

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  alert: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  promotion: { icon: Megaphone, color: 'text-[#F4D03F]', bg: 'bg-[#F4D03F]/10', border: 'border-[#F4D03F]/20' },
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

  // Auto-rotate visible messages
  const visibleMessages = messages.filter(m => !dismissed.has(m.id));

  useEffect(() => {
    if (visibleMessages.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % visibleMessages.length);
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visibleMessages.length]);

  if (visibleMessages.length === 0) return null;

  const msg = visibleMessages[currentIdx % visibleMessages.length];
  const config = TYPE_CONFIG[msg.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${config.bg} ${config.border}`}
        >
          <Icon className={`w-4 h-4 shrink-0 ${config.color}`} />
          <p className={`text-xs flex-1 ${config.color}`}>
            {msg.content}
          </p>
          <button
            onClick={() => setDismissed(prev => new Set(prev).add(msg.id))}
            className="shrink-0 p-0.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cerrar mensaje"
          >
            <X className="w-3 h-3 text-white/30" />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator for multiple messages */}
      {visibleMessages.length > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {visibleMessages.map((_, idx) => (
            <span
              key={idx}
              className={`w-1 h-1 rounded-full transition-all duration-300
                ${idx === currentIdx % visibleMessages.length ? 'bg-[#F4D03F] w-3' : 'bg-white/20'}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}