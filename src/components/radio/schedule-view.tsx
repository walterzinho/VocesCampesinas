'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, User, Mic, Music } from 'lucide-react';
import { motion } from 'framer-motion';

interface Program {
  id: string;
  name: string;
  host: string | null;
  description: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  genre: string | null;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ScheduleView() {
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const res = await fetch('/api/programs/all');
        if (res.ok && !cancelled) {
          setAllPrograms(await res.json());
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    }
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const dayPrograms = allPrograms
    .filter(p => p.dayOfWeek === selectedDay && p.isActive)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isCurrentlyPlaying = (start: string, end: string) => {
    if (selectedDay !== now.getDay()) return false;
    return currentTime >= start && currentTime < end;
  };

  const isUpcoming = (start: string) => {
    if (selectedDay !== now.getDay()) return false;
    return start > currentTime;
  };

  const hasLiveProgram = dayPrograms.some(p => isCurrentlyPlaying(p.startTime, p.endTime));
  const hasAnyProgramToday = allPrograms.some(p => p.dayOfWeek === now.getDay() && p.isActive);
  const isToday = selectedDay === now.getDay();

  return (
    <div className="w-full">
      {/* Day selector */}
      <div className="flex gap-1 overflow-x-auto pb-2 hide-scrollbar">
        {DAY_NAMES.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDay(idx)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200
              ${selectedDay === idx
                ? 'bg-[#F4D03F] text-[#17202A] shadow-md'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }
              ${idx === now.getDay() ? 'ring-1 ring-[#F4D03F]/30' : ''}
            `}
          >
            {day.substring(0, 3)}
          </button>
        ))}
      </div>

      {/* Program list */}
      <div className="mt-3 space-y-2 max-h-72 overflow-y-auto hide-scrollbar">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-16 rounded-xl bg-white/5" />
            ))}
          </div>
        ) : dayPrograms.length === 0 ? (
          /* Empty state - Música de la Tierrita */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative py-8 px-4 rounded-2xl overflow-hidden border border-white/5"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#F4D03F]/5 via-transparent to-transparent" />

            <div className="relative flex flex-col items-center text-center">
              {/* Musical notes decoration */}
              <div className="relative w-16 h-16 mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F4D03F]/20 to-[#F4D03F]/5 flex items-center justify-center"
                >
                  <Music className="w-7 h-7 text-[#F4D03F]/70" />
                </motion.div>
                {/* Floating note particles */}
                <motion.span
                  animate={{ y: [-2, -8, -2], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  className="absolute -top-2 -right-2 text-lg"
                >
                  🎵
                </motion.span>
                <motion.span
                  animate={{ y: [-2, -10, -2], opacity: [0.2, 0.7, 0.2] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                  className="absolute -bottom-1 -left-2 text-sm"
                >
                  🎶
                </motion.span>
              </div>

              <h4 className="text-base font-bold text-[#F4D03F] mb-1">
                Música de la Tierrita
              </h4>
              <p className="text-[11px] text-white/40 max-w-[200px] leading-relaxed">
                {isToday
                  ? 'Disfruta la mejor música campesina mientras no hay programación en vivo'
                  : `Sin programación para el ${DAY_NAMES[selectedDay]}`
                }
              </p>
            </div>
          </motion.div>
        ) : (
          dayPrograms.map((prog) => {
            const isLive = isCurrentlyPlaying(prog.startTime, prog.endTime);
            const isNext = isUpcoming(prog.startTime);

            return (
              <div
                key={prog.id}
                className={`relative p-3 rounded-xl transition-all duration-300
                  ${isLive
                    ? 'bg-gradient-to-r from-[#F4D03F]/15 to-transparent border border-[#F4D03F]/30 shadow-[0_0_20px_rgba(244,208,63,0.1)]'
                    : isNext
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-white/[0.02] border border-white/5'
                  }
                `}
              >
                {isLive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-[10px] font-bold text-red-400 uppercase">Al Aire</span>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm truncate ${isLive ? 'text-[#F4D03F]' : 'text-white'}`}>
                      {prog.name}
                    </h4>
                    {prog.host && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mic className="w-3 h-3 text-white/30" />
                        <span className="text-xs text-white/40">{prog.host}</span>
                      </div>
                    )}
                    {prog.description && (
                      <p className="text-[11px] text-white/25 mt-1 line-clamp-2">{prog.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-xs text-white/50 font-mono">
                      {prog.startTime} - {prog.endTime}
                    </span>
                  </div>
                </div>

                {prog.genre && (
                  <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full
                    ${isLive ? 'bg-[#F4D03F]/20 text-[#F4D03F]' : 'bg-white/5 text-white/30'}
                  `}>
                    {prog.genre}
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Show "Música de la Tierrita" note when today has no current live show */}
        {!loading && !hasLiveProgram && isToday && dayPrograms.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4D03F]/5 border border-[#F4D03F]/10"
          >
            <Music className="w-3.5 h-3.5 text-[#F4D03F]/50 shrink-0" />
            <span className="text-[11px] text-[#F4D03F]/60">
              Ahora: <strong className="text-[#F4D03F]/80">Música de la Tierrita</strong>
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
