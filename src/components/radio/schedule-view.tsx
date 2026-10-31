'use client';

import { useEffect, useState, useMemo } from 'react';
import { Clock, Mic, Music, ChevronDown, ChevronUp, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slot, buildSlots } from '@/lib/schedule-utils';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function ScheduleView() {
  const [slots, setSlots] = useState<Slot[]>([]);
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
        if (progRes.ok && !cancelled) {
          const programs = await progRes.json();
          setSlots(buildSlots(programs));
        }
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

  const isCurrentlyPlaying = (slot: Slot) =>
    slot.dayOfWeek === todayIdx && currentTime >= slot.startTime && currentTime < slot.endTime;
  const isUpcoming = (slot: Slot) =>
    slot.dayOfWeek === todayIdx && slot.startTime > currentTime;

  // Agrupar emisiones por día, ordenadas por hora (multi-horario: un programa
  // puede aparecer varias veces el mismo día o en días distintos)
  const weekData = useMemo(() => (
    DAY_NAMES.map((dayName, dayIdx) => ({
      dayIdx,
      dayName,
      slots: slots
        .filter(s => s.dayOfWeek === dayIdx)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }))
  ), [slots]);

  // Reordenar: hoy primero, resto de la semana en orden
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

  const todaySlots = weekData[todayIdx].slots;
  const hasLiveProgram = todaySlots.some(isCurrentlyPlaying);
  const totalActivePrograms = new Set(slots.map(s => s.programId)).size;
  const totalEmissions = slots.length;

  return (
    <div className="w-full">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-app-text">Programación Semanal</h3>
          <p className="text-[10px] text-app-t3 mt-0.5">
            {totalActivePrograms} programa{totalActivePrograms !== 1 ? 's' : ''} · {totalEmissions} emisione{totalEmissions !== 1 ? 's' : ''} esta semana
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-20 rounded-lg bg-app-surface" />)}</div>
      ) : totalEmissions === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative py-10 px-4 rounded-lg overflow-hidden elev-1 bg-app-surface">
          <div className="relative flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-3">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 rounded-2xl bg-app-accent/10 flex items-center justify-center">
                <Music className="w-7 h-7 text-app-accent/70" />
              </motion.div>
            </div>
            <h4 className="text-base font-medium text-app-accent mb-1">{offAirName}</h4>
            <p className="text-[11px] text-app-t3 max-w-[220px] leading-relaxed">Aún no hay programación configurada para esta semana</p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2.5 pb-4">
          {orderedWeek.map(({ dayIdx, dayName, slots: daySlots }) => {
            if (daySlots.length === 0) return null;
            const isCollapsed = collapsedDays.has(dayIdx);
            const isToday = dayIdx === todayIdx;
            const liveSlot = daySlots.find(isCurrentlyPlaying);

            return (
              <div key={dayIdx} className={`rounded-lg overflow-hidden transition-colors elev-1 ${isToday ? 'bg-app-accent/[0.06]' : 'bg-app-surface'}`}>
                {/* Day header — clickable to collapse/expand */}
                <button
                  onClick={() => toggleDay(dayIdx)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-app-surface-h transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-medium uppercase tracking-wider ${isToday ? 'text-app-accent' : 'text-app-t2'}`}>
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-app-accent/15 text-app-accent font-medium">Hoy</span>
                    )}
                    {liveSlot && (
                      <span className="flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                        <span className="text-[9px] font-medium text-red-400">Al Aire</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-app-tdim">{daySlots.length} emisión{daySlots.length !== 1 ? 'es' : ''}</span>
                    {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-app-tdim" /> : <ChevronUp className="w-3.5 h-3.5 text-app-tdim" />}
                  </div>
                </button>

                {/* Emissions list */}
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
                        {daySlots.map((slot) => {
                          const isLive = isCurrentlyPlaying(slot);
                          const isNext = isUpcoming(slot);
                          return (
                            <div key={`${slot.programId}-${slot.startTime}-${slot.isRerun}`} className={`relative rounded-md transition-all duration-300 overflow-hidden ${isLive ? 'bg-app-accent/10 border border-app-accent/40' : isNext ? 'bg-app-bg border border-app-bdr' : 'bg-app-bg/60 border border-app-bdr-l'}`}>
                              {isLive && (
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                                  <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                                  <span className="text-[9px] font-medium text-red-400 uppercase">En Vivo</span>
                                </div>
                              )}
                              {slot.isRerun && !isLive && (
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                                  <Repeat className="w-2.5 h-2.5 text-app-t3" />
                                  <span className="text-[8px] font-medium text-app-t3 uppercase tracking-wide">Reemisión</span>
                                </div>
                              )}
                              <div className="flex">
                                {/* Left: Image or placeholder */}
                                {slot.imageUrl ? (
                                  <div className="shrink-0 w-24 h-24 relative bg-app-surface overflow-hidden">
                                    <img src={slot.imageUrl} alt={slot.name} className="w-full h-full object-cover" loading="lazy" />
                                    <div className={`absolute top-0 left-0 w-1 h-full ${isLive ? 'bg-app-accent rounded-r' : slot.isRerun ? 'bg-app-t3/20 rounded-r' : 'bg-app-t3/30 rounded-r'}`} />
                                  </div>
                                ) : (
                                  <div className={`shrink-0 w-24 h-24 relative flex items-center justify-center ${isLive ? 'bg-app-accent/15' : 'bg-app-t3/5'}`}>
                                    {slot.isRerun && !isLive ? (
                                      <Repeat className="w-7 h-7 text-app-tdim" />
                                    ) : (
                                      <Music className={`w-8 h-8 ${isLive ? 'text-app-accent/70' : 'text-app-tdim'}`} />
                                    )}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${isLive ? 'bg-app-accent rounded-r' : 'bg-app-t3/30 rounded-r'}`} />
                                  </div>
                                )}

                                {/* Right: Program data */}
                                <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                                  <div>
                                    <h4 className={`font-medium text-[13px] truncate ${isLive ? 'text-app-accent' : 'text-app-text'}`}>{slot.name}</h4>
                                    {slot.host && <div className="flex items-center gap-1 mt-0.5"><Mic className="w-3 h-3 text-app-t3" /><span className="text-[11px] text-app-t3">{slot.host}</span></div>}
                                    {slot.description && <p className="text-[10px] text-app-tdim mt-0.5 line-clamp-2">{slot.description}</p>}
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5">
                                    {slot.genre ? (
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${isLive ? 'bg-app-accent/20 text-app-accent' : 'bg-app-surface text-app-t3'}`}>{slot.genre}</span>
                                    ) : <span />}
                                    <div className="flex items-center gap-1 ml-auto shrink-0">
                                      <Clock className="w-3 h-3 text-app-t3" />
                                      <span className="text-[11px] text-app-t3 font-mono">{slot.startTime} - {slot.endTime}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Off-air footer */}
                        {isToday && !hasLiveProgram && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-app-accent/5 border border-app-accent/10">
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
