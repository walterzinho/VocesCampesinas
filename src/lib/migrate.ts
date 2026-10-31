import { PrismaClient } from '@prisma/client';

/**
 * Migración runtime para la BD de producción (volumen Docker).
 *
 * El entrypoint del Docker NO ejecuta `prisma migrate` sobre el volumen:
 * solo copia un dev.db pre-construido si el volumen está vacío. Por eso,
 * los cambios de esquema se aplican aquí con SQL idempotente la primera
 * vez que el servidor abre la BD después del deploy.
 *
 * Pasos:
 *  1. Crear tabla Schedule + índices (si no existen).
 *  2. Añadir columna Program.schedulesMigrated (si no existe).
 *  3. Respaldo único: por cada programa con horario legacy (dayOfWeek +
 *     startTime) y sin marca de migración, crear su Schedule con la
 *     duración calculada desde endTime (soporta cruce de medianoche).
 */

const globalForMigrate = globalThis as unknown as {
  __vcMigratePromise?: Promise<void>;
};

async function computeDurationMin(start: string, end: string | null): Promise<number> {
  const parse = (t: string) => {
    const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
    return h * 60 + m;
  };
  let mins = 60;
  if (start.includes(':')) {
    const startMins = parse(start);
    if (end && end.includes(':')) {
      mins = parse(end) - startMins;
      if (mins <= 0) mins += 24 * 60; // cruza medianoche
    }
  }
  return Math.min(Math.max(mins, 5), 24 * 60);
}

async function migrate(db: PrismaClient): Promise<void> {
  // 1. Tabla Schedule (idempotente; coincide con prisma/schema.prisma)
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Schedule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "programId" TEXT NOT NULL,
      "dayOfWeek" INTEGER NOT NULL,
      "startTime" TEXT NOT NULL,
      "durationMin" INTEGER NOT NULL DEFAULT 60,
      "isRerun" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Schedule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Schedule_programId_idx" ON "Schedule"("programId")`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Schedule_dayOfWeek_startTime_idx" ON "Schedule"("dayOfWeek", "startTime")`
  );

  // 2. Columna de marca de migración (SQLite falla si ya existe: ignorar)
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "Program" ADD COLUMN "schedulesMigrated" BOOLEAN NOT NULL DEFAULT 0`
    );
  } catch {
    // La columna ya existe — normal en arranques posteriores
  }

  // 3. Respaldo único de horarios legacy
  //    Los programas legacy comparten nombre cuando son el mismo show en
  //    varios días (sistema antiguo: 1 fila por día). Se fusionan: el
  //    primero conserva su id y todos aportan un Schedule; los duplicados
  //    se eliminan. Idempotente y tolerante a cortes a mitad de grupo.
  const rows = await db.$queryRawUnsafe<
    { id: string; name: string; dayOfWeek: number; startTime: string; endTime: string; schedulesMigrated: number }[]
  >(
    `SELECT "id", "name", "dayOfWeek", "startTime", "endTime", "schedulesMigrated" FROM "Program" ORDER BY "createdAt" ASC`
  );

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.name;
    if (!groups.has(key)) groups.set(key, [] as unknown as typeof rows);
    (groups.get(key) as unknown as typeof rows).push(row);
  }

  let migratedPrograms = 0;
  for (const [, group] of groups) {
    const migrated = group.filter((r) => r.schedulesMigrated === 1);
    const unmigrated = group.filter((r) => r.schedulesMigrated !== 1);
    if (unmigrated.length === 0) continue;

    const primary = migrated[0] || unmigrated[0];
    try {
      for (const row of unmigrated) {
        if (row.startTime && row.startTime.includes(':') && row.dayOfWeek >= 0 && row.dayOfWeek <= 6) {
          const durationMin = await computeDurationMin(row.startTime, row.endTime);
          const fakeId = `sch_${primary.id}_${row.dayOfWeek}_${row.startTime.replace(':', '')}`;
          await db.$executeRawUnsafe(
            `INSERT INTO "Schedule" ("id", "programId", "dayOfWeek", "startTime", "durationMin", "isRerun", "sortOrder", "createdAt", "updatedAt")
             SELECT ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             WHERE NOT EXISTS (
               SELECT 1 FROM "Schedule" WHERE "programId" = ? AND "dayOfWeek" = ? AND "startTime" = ?
             )`,
            fakeId, primary.id, row.dayOfWeek, row.startTime, durationMin, primary.id, row.dayOfWeek, row.startTime
          );
        }
        // Eliminar fila duplicada (conserva la primera del grupo)
        if (row.id !== primary.id) {
          await db.$executeRawUnsafe(`DELETE FROM "Schedule" WHERE "programId" = ?`, row.id);
          await db.$executeRawUnsafe(`DELETE FROM "Program" WHERE "id" = ?`, row.id);
        }
      }
      await db.$executeRawUnsafe(
        `UPDATE "Program" SET "schedulesMigrated" = 1 WHERE "id" = ?`,
        primary.id
      );
      migratedPrograms++;
    } catch (err) {
      console.error(`[migrate] Error respaldando programa "${primary.name}" (${primary.id}):`, err);
    }
  }

  if (migratedPrograms > 0) {
    console.log(`[migrate] Horarios respaldados a Schedule: ${migratedPrograms} programa(s)`);
  }
}

/**
 * Ejecuta la migración una sola vez por proceso. Si falla, se permite
 * reintentar en la siguiente llamada (no bloquea el arranque de la app).
 */
export function runMigrations(db: PrismaClient): Promise<void> {
  if (!globalForMigrate.__vcMigratePromise) {
    globalForMigrate.__vcMigratePromise = migrate(db).catch((err) => {
      console.error('[migrate] Migración runtime falló:', err);
      globalForMigrate.__vcMigratePromise = undefined;
    });
  }
  return globalForMigrate.__vcMigratePromise;
}
