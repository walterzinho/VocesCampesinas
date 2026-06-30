'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, User, Mic } from 'lucide-react';

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

export default function ScheduleView() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  useEffect(() => {
    async function fetchPrograms() {
      try {
        const res = await fetch('/api/programs');
        if (res.ok) {
          const data = await res.json();
          setPrograms(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchPrograms();
    const interval = setInterval(fetchPrograms, 60000);
    return () => clearInterval(interval);
  }, []);

  // For the selected day, fetch from /api/programs/all and filter
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch('/api/programs/all');
        if (res.ok) {
          setAllPrograms(await res.json());
        }
      } catch { /* ignore */ }
    }
    fetchAll();
  }, []);

  const dayPrograms = allPrograms
    .filter(p => p.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isCurrentlyPlaying = (start: string, end: string) => {
    if (selectedDay !== now.getDay()) return false;
    return currentTime >= start && currentTime < end;
  };

  const isUpcoming = (start: string) => {
    if (selectedDay !== now.getDay()) return false;
    return start > currentTime;
  };

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
        {dayPrograms.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Sin programación este día
          </div>
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
      </div>
    </div>
  );
}