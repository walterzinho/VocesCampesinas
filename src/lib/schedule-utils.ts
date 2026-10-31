/**
 * Utilidades de horarios multi-slot.
 * Convierte programas (con N horarios en Schedule) en "slots" planos
 * para calcular qué está al aire y qué sigue.
 */

export interface ScheduleRow {
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  isRerun: boolean;
  sortOrder?: number;
}

export interface ProgramWithSchedules {
  id: string;
  name: string;
  host: string | null;
  description?: string | null;
  genre?: string | null;
  isActive: boolean;
  imageUrl?: string | null;
  playerImageUrl?: string | null;
  schedulesMigrated?: boolean;
  dayOfWeek?: number;
  startTime?: string | null;
  endTime?: string | null;
  schedules: ScheduleRow[];
}

export interface Slot {
  programId: string;
  name: string;
  host: string | null;
  description: string | null;
  genre: string | null;
  imageUrl: string | null;
  playerImageUrl: string | null;
  isActive: boolean;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMin: number;
  isRerun: boolean;
}

export function endTimeFrom(start: string, durationMin: number): string {
  const [h, m] = start.split(':').map((n) => parseInt(n, 10));
  const total = (h * 60 + m + durationMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function fmtNow(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Aplana programas + horarios a slots. Fallback legacy para programas sin respaldo. */
export function buildSlots(programs: ProgramWithSchedules[]): Slot[] {
  const slots: Slot[] = [];
  for (const p of programs) {
    if (!p.isActive) continue;
    const base = {
      programId: p.id,
      name: p.name,
      host: p.host,
      description: p.description ?? null,
      genre: p.genre ?? null,
      imageUrl: p.imageUrl ?? null,
      playerImageUrl: p.playerImageUrl ?? null,
      isActive: p.isActive,
    };
    if (p.schedules && p.schedules.length > 0) {
      for (const s of p.schedules) {
        slots.push({
          ...base,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: endTimeFrom(s.startTime, s.durationMin),
          durationMin: s.durationMin,
          isRerun: s.isRerun,
        });
      }
    } else if (p.startTime) {
      // Programa legacy (sin respaldo a Schedule): usar columnas antiguas
      slots.push({
        ...base,
        dayOfWeek: p.dayOfWeek ?? 0,
        startTime: p.startTime,
        endTime: p.endTime || endTimeFrom(p.startTime, 60),
        durationMin: 60,
        isRerun: false,
      });
    }
  }
  return slots;
}

export function findCurrentSlot(slots: Slot[], now = new Date()): Slot | null {
  const time = fmtNow(now);
  const today = now.getDay();
  return slots.find((s) => s.dayOfWeek === today && time >= s.startTime && time < s.endTime) || null;
}

/** Siguiente emisión: después de ahora hoy, o la primera de los días siguientes. */
export function findNextSlot(slots: Slot[], now = new Date()): Slot | null {
  const time = fmtNow(now);
  const today = now.getDay();
  const dayDistance = (s: Slot): number => {
    let d = (s.dayOfWeek - today + 7) % 7;
    if (d === 0 && s.startTime <= time) d = 7; // ya pasó hoy → próxima semana
    return d;
  };
  const upcoming = slots
    .map((s) => ({ s, d: dayDistance(s) }))
    .filter(({ d }) => d > 0)
    .sort((a, b) => a.d - b.d || a.s.startTime.localeCompare(b.s.startTime));
  return upcoming[0]?.s || null;
}
