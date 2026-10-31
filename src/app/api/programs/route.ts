import { db } from '@/lib/db';
import { runMigrations } from '@/lib/migrate';
import { verifyAdmin } from '@/lib/auth';
import { Prisma, type Program as ProgramModel } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/programs - public (programas de hoy, con horarios)
export async function GET() {
  try {
    await runMigrations(db);
    const today = new Date().getDay();
    const programs = await db.program.findMany({
      where: { isActive: true },
      include: { schedules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }, { sortOrder: 'asc' }] } },
      orderBy: { sortOrder: 'asc' },
    });
    // Solo programas con al menos un horario de hoy (modo nuevo) o legacy de hoy
    const todays = programs.filter(
      (p) => p.schedules.some((s) => s.dayOfWeek === today) || (!p.schedulesMigrated && p.dayOfWeek === today && !!p.startTime)
    );
    return NextResponse.json(todays);
  } catch {
    return NextResponse.json({ error: 'Error fetching programs' }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface ScheduleInput {
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  isRerun: boolean;
}

const TIME_RE = /^\d{1,2}:\d{2}$/;

function normalizeTime(t: string): string | null {
  if (!TIME_RE.test(t)) return null;
  const [h, m] = t.split(':').map((n) => parseInt(n, 10));
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function sanitizeSchedules(raw: unknown): ScheduleInput[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ScheduleInput[] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const day = Number((s as Record<string, unknown>).dayOfWeek);
    const time = normalizeTime(String((s as Record<string, unknown>).startTime ?? ''));
    if (Number.isNaN(day) || day < 0 || day > 6 || !time) continue;
    let durationMin = Number((s as Record<string, unknown>).durationMin);
    if (!Number.isFinite(durationMin) || durationMin < 5) durationMin = 60;
    durationMin = Math.min(Math.round(durationMin), 24 * 60);
    out.push({
      dayOfWeek: day,
      startTime: time,
      durationMin,
      isRerun: Boolean((s as Record<string, unknown>).isRerun),
    });
  }
  // Ordenar por día y hora para sortOrder estable
  out.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  return out;
}

function endTimeFrom(start: string, durationMin: number): string {
  const [h, m] = start.split(':').map((n) => parseInt(n, 10));
  const total = (h * 60 + m + durationMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Campos escalares permitidos del programa (evita pasar schedules dentro de data)
function programFields(body: Record<string, unknown>) {
  return {
    name: body.name !== undefined ? String(body.name) : undefined,
    host: body.host !== undefined ? String(body.host) : undefined,
    description: body.description !== undefined ? String(body.description) : undefined,
    genre: body.genre !== undefined ? String(body.genre) : undefined,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : undefined,
    playerImageUrl: body.playerImageUrl !== undefined ? String(body.playerImageUrl) : undefined,
  };
}

// POST /api/programs - admin only
// Modo nuevo:  { ...campos, schedules: [{ dayOfWeek, startTime, durationMin, isRerun }] }
// Modo legacy: { ...campos, days: [1,3,5] } → un slot por día con el mismo horario
export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await runMigrations(db);
    const body = (await request.json()) as Record<string, unknown>;
    const fields = programFields(body);
    if (!fields.name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

    const schedules = sanitizeSchedules(body.schedules);
    if (schedules && schedules.length > 0) {
      // ── Modo nuevo: 1 programa + N horarios ──
      const first = schedules[0];
      const createData: Prisma.ProgramCreateInput = {
        name: fields.name!,
        host: fields.host ?? null,
        description: fields.description ?? null,
        genre: fields.genre ?? null,
        isActive: fields.isActive ?? true,
        sortOrder: fields.sortOrder ?? 0,
        imageUrl: fields.imageUrl ?? null,
        playerImageUrl: fields.playerImageUrl ?? null,
        // espejo legacy del primer horario (compatibilidad)
        dayOfWeek: first.dayOfWeek,
        startTime: first.startTime,
        endTime: endTimeFrom(first.startTime, first.durationMin),
        schedulesMigrated: true,
        schedules: {
          create: schedules.map((s, i) => ({ ...s, sortOrder: i })),
        },
      };
      const program = await db.program.create({
        data: createData,
        include: { schedules: true },
      });
      await db.adminLog.create({
        data: { action: 'CREATE_PROGRAM', detail: `${program.name} · ${schedules.length} horario(s)` },
      });
      return NextResponse.json(program, { status: 201 });
    }

    // ── Modo legacy (batch por días, mismo horario para todos) ──
    const days = Array.isArray(body.days) ? (body.days as unknown[]).map(Number).filter((d) => d >= 0 && d <= 6) : [];
    const startTime = normalizeTime(String(body.startTime ?? ''));
    if (days.length === 0 || !startTime) {
      return NextResponse.json({ error: 'Requiere schedules[] o days[] + startTime' }, { status: 400 });
    }
    const endTime = normalizeTime(String(body.endTime ?? '')) || endTimeFrom(startTime, 60);
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    let durationMin = h2 * 60 + m2 - (h1 * 60 + m1);
    if (durationMin <= 0) durationMin += 24 * 60;

    const results: ProgramModel[] = [];
    for (const day of days) {
      const createData: Prisma.ProgramCreateInput = {
        name: fields.name!,
        host: fields.host ?? null,
        description: fields.description ?? null,
        genre: fields.genre ?? null,
        isActive: fields.isActive ?? true,
        sortOrder: fields.sortOrder ?? 0,
        imageUrl: fields.imageUrl ?? null,
        playerImageUrl: fields.playerImageUrl ?? null,
        dayOfWeek: day,
        startTime,
        endTime,
        schedulesMigrated: true,
        schedules: { create: [{ dayOfWeek: day, startTime, durationMin, isRerun: false, sortOrder: 0 }] },
      };
      const program = await db.program.create({ data: createData });
      results.push(program);
    }
    await db.adminLog.create({
      data: { action: 'CREATE_PROGRAM_BATCH', detail: `${fields.name} x${days.length} días [${days.join(',')}]` },
    });
    return NextResponse.json(results, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creating program' }, { status: 500 });
  }
}

// PUT /api/programs - admin only
// Modo nuevo: { id, ...campos, schedules: [...] } → reemplaza todos los horarios
export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await runMigrations(db);
    const body = (await request.json()) as Record<string, unknown>;
    const schedules = sanitizeSchedules(body.schedules);

    // ── Modo nuevo: actualizar 1 programa + reemplazar horarios ──
    if (schedules && schedules.length > 0 && body.id) {
      const id = String(body.id);
      const fields = programFields(body);
      const first = schedules[0];
      const updateData: Prisma.ProgramUpdateInput = {
        ...fields,
        dayOfWeek: first.dayOfWeek,
        startTime: first.startTime,
        endTime: endTimeFrom(first.startTime, first.durationMin),
        schedulesMigrated: true,
      };
      const program = await db.$transaction(async (tx) => {
        const updated = await tx.program.update({
          where: { id },
          data: updateData,
        });
        await tx.schedule.deleteMany({ where: { programId: id } });
        await tx.schedule.createMany({
          data: schedules.map((s, i) => ({ ...s, programId: id, sortOrder: i })),
        });
        return updated;
      });
      await db.adminLog.create({
        data: { action: 'UPDATE_PROGRAM', detail: `${program.name} · ${schedules.length} horario(s)` },
      });
      const withSchedules = await db.program.findUnique({
        where: { id },
        include: { schedules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }, { sortOrder: 'asc' }] } },
      });
      return NextResponse.json(withSchedules);
    }

    // ── Modo legacy: solo campos (sin tocar horarios) ──
    if (body.id) {
      const { id, ...data } = body as { id: string } & Record<string, unknown>;
      const program = await db.program.update({ where: { id }, data });
      await db.adminLog.create({ data: { action: 'UPDATE_PROGRAM', detail: program.name } });
      return NextResponse.json(program);
    }

    // ── Modo legacy batch (por nombre): borrar y recrear ──
    const batchName = body.batchUpdateName;
    const days = Array.isArray(body.days) ? (body.days as unknown[]).map(Number).filter((d) => d >= 0 && d <= 6) : [];
    const startTime = normalizeTime(String(body.startTime ?? ''));
    if (batchName && days.length > 0 && startTime) {
      const fields = programFields(body);
      const endTime = normalizeTime(String(body.endTime ?? '')) || endTimeFrom(startTime, 60);
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);
      let durationMin = h2 * 60 + m2 - (h1 * 60 + m1);
      if (durationMin <= 0) durationMin += 24 * 60;

      const oldIds = (await db.program.findMany({ where: { name: String(batchName) }, select: { id: true } })).map((p) => p.id);
      await db.$transaction(async (tx) => {
        if (oldIds.length > 0) {
          await tx.schedule.deleteMany({ where: { programId: { in: oldIds } } });
          await tx.program.deleteMany({ where: { id: { in: oldIds } } });
        }
      });
      const results: ProgramModel[] = [];
      for (const day of days) {
        const createData: Prisma.ProgramCreateInput = {
          name: fields.name!,
          host: fields.host ?? null,
          description: fields.description ?? null,
          genre: fields.genre ?? null,
          isActive: fields.isActive ?? true,
          sortOrder: fields.sortOrder ?? 0,
          imageUrl: fields.imageUrl ?? null,
          playerImageUrl: fields.playerImageUrl ?? null,
          dayOfWeek: day,
          startTime,
          endTime,
          schedulesMigrated: true,
          schedules: { create: [{ dayOfWeek: day, startTime, durationMin, isRerun: false, sortOrder: 0 }] },
        };
        const program = await db.program.create({ data: createData });
        results.push(program);
      }
      await db.adminLog.create({
        data: { action: 'UPDATE_PROGRAM_BATCH', detail: `${fields.name} x${days.length} días` },
      });
      return NextResponse.json(results);
    }

    return NextResponse.json({ error: 'Datos insuficientes' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Error updating program' }, { status: 500 });
  }
}

// DELETE /api/programs - admin only
// ?id=... borra un programa (y sus horarios) · ?name=... borra todos los que compartan nombre
export async function DELETE(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await runMigrations(db);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (name) {
      const ids = (await db.program.findMany({ where: { name }, select: { id: true } })).map((p) => p.id);
      await db.$transaction(async (tx) => {
        if (ids.length > 0) await tx.schedule.deleteMany({ where: { programId: { in: ids } } });
        await tx.program.deleteMany({ where: { name } });
      });
      await db.adminLog.create({ data: { action: 'DELETE_PROGRAM_BATCH', detail: name } });
    } else if (id) {
      await db.$transaction(async (tx) => {
        await tx.schedule.deleteMany({ where: { programId: id } });
        await tx.program.delete({ where: { id } });
      });
      await db.adminLog.create({ data: { action: 'DELETE_PROGRAM', detail: id } });
    } else {
      return NextResponse.json({ error: 'ID or name required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error deleting program' }, { status: 500 });
  }
}
