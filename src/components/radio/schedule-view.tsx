'use client';

import { useEffect, useState } from 'react';
import { Clock, Mic, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Program {
  id: string;
  name: string;
  host: string | null;
  description: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  genre: string | null;
  imageUrl: string | null;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function ScheduleView() {
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [offAirName, setOffAirName] = useState('Música de la Tierrita');

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayIdx = now.getDay();

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [progRes, setRes] = await Promise.all([
          fetch('/api/programs/all'),
          fetch('/api/settings'),
        ]);
        if (progRes.ok && !cancelled) setAllPrograms(await progRes.json());
        if (setRes.ok && !cancelled) {
          const setData = await setRes.json();
          if (setData.offAirName) setOffAirName(setData.offAirName);
        }
      } catch { /* */ }
      if (!cancelled) setLoading(false);
    }
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const isCurrentlyPlaying = (start: string, end: string, day: number) => {
    if (day !== todayIdx) return false;
    return currentTime >= start && currentTime < end;
  };
  const isUpcoming = (start: string, day: number) => {
    if (day !== todayIdx) return false;
    return start > currentTime;
  };

  // Group programs by day, sort within each day
  const weekData = DAY_NAMES.map((dayName, dayIdx) => {
    const progs = allPrograms
      .filter(p => p.dayOfWeek === dayIdx && p.isActive)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { dayIdx, dayName, programs: progs };
  });

  // Reorder so today is first, then rest of week in order
  const orderedWeek = [
    weekData[todayIdx],
    ...weekData.filter((_, i) => i !== todayIdx),
  ];

  const toggleDay = (dayIdx: number) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIdx)) next.delete(dayIdx);
      else next.add(dayIdx);
      return next;
    });
  };

  // Check if any day has live/upcoming
  const todayProgs = weekData[todayIdx].programs;
  const hasLiveProgram = todayProgs.some(p => isCurrentlyPlaying(p.startTime, p.endTime, todayIdx));

  const totalActive = allPrograms.filter(p => p.isActive).length;

  return (
    <div className="w-full">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-app-text">Programación Semanal</h3>
          <p className="text-[10px] text-app-t3 mt-0.5">{totalActive} programas activos esta semana</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-20 rounded-xl bg-app-surface" />)}</div>
      ) : totalActive === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative py-10 px-4 rounded-2xl overflow-hidden border border-app-bdr-l">
          <div className="absolute inset-0 bg-gradient-to-b from-app-accent/5 via-transparent to-transparent" />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-3">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 rounded-2xl bg-gradient-to-br from-app-accent/20 to-app-accent/5 flex items-center justify-center">
                <Music className="w-7 h-7 text-app-accent/70" />
              </motion.div>
            </div>
            <h4 className="text-base font-bold text-app-accent mb-1">{offAirName}</h4>
            <p className="text-[11px] text-app-t3 max-w-[220px] leading-relaxed">Aún no hay programación configurada para esta semana</p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2.5 pb-4">
          {orderedWeek.map(({ dayIdx, dayName, programs }) => {
            if (programs.length === 0) return null;
            const isCollapsed = collapsedDays.has(dayIdx);
            const isToday = dayIdx === todayIdx;
            const liveProg = programs.find(p => isCurrentlyPlaying(p.startTime, p.endTime, dayIdx));

            return (
              <div key={dayIdx} className={`rounded-2xl border overflow-hidden transition-colors ${isToday ? 'border-app-accent/25 bg-app-accent/[0.03]' : 'border-app-bdr-l bg-app-surface'}`}>
                {/* Day header - clickable to collapse/expand */}
                <button
                  onClick={() => toggleDay(dayIdx)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-app-surface-h transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-app-accent' : 'text-app-t2'}`}>
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-app-accent/15 text-app-accent font-bold">Hoy</span>
                    )}
                    {liveProg && (
                      <span className="flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                        <span className="text-[9px] font-bold text-red-400">Al Aire</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-app-tdim">{programs.length} prog.</span>
                    {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-app-tdim" /> : <ChevronUp className="w-3.5 h-3.5 text-app-tdim" />}
                  </div>
                </button>

                {/* Programs list */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2.5 pb-2.5 space-y-1.5">
                        {programs.map((prog) => {
                          const isLive = isCurrentlyPlaying(prog.startTime, prog.endTime, dayIdx);
                          const isNext = isUpcoming(prog.startTime, dayIdx);
                          return (
                            <div key={prog.id} className={`relative p-2.5 rounded-xl transition-all duration-300 ${isLive ? 'bg-gradient-to-r from-app-accent/15 to-transparent border border-app-accent/30 shadow-[0_0_20px_rgba(244,208,63,0.1)]' : isNext ? 'bg-app-bg border border-app-bdr' : 'bg-app-bg/50 border border-app-bdr-l'}`}>
                              {isLive && (
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                                  <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                                  <span className="text-[9px] font-bold text-red-400 uppercase">En Vivo</span>
                                </div>
                              )}
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-semibold text-[13px] truncate ${isLive ? 'text-app-accent' : 'text-app-text'}`}>{prog.name}</h4>
                                  {prog.host && <div className="flex items-center gap-1 mt-0.5"><Mic className="w-3 h-3 text-app-t3" /><span className="text-[11px] text-app-t3">{prog.host}</span></div>}
                                  {prog.description && <p className="text-[10px] text-app-tdim mt-0.5 line-clamp-1">{prog.description}</p>}
                                </div>
                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                  <Clock className="w-3 h-3 text-app-t3" />
                                  <span className="text-[11px] text-app-t3 font-mono">{prog.startTime} - {prog.endTime}</span>
                                </div>
                              </div>
                              {prog.genre && <span className={`inline-block mt-1.5 text-[9px] px-2 py-0.5 rounded-full ${isLive ? 'bg-app-accent/20 text-app-accent' : 'bg-app-surface text-app-t3'}`}>{prog.genre}</span>}
                              {prog.imageUrl && (
                                <div className="mt-1.5 rounded-lg overflow-hidden h-20 bg-white/5">
                                  <img src={prog.imageUrl} alt={prog.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Off-air footer */}
                        {isToday && !hasLiveProgram && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-app-accent/5 border border-app-accent/10">
                            <Music className="w-3.5 h-3.5 text-app-accent/50 shrink-0" />
                            <span className="text-[10px] text-app-accent/60">Ahora: <strong className="text-app-accent/80">{offAirName}</strong></span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}