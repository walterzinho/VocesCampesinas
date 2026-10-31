/**
 * Test de la migración runtime contra una BD con el esquema VIEJO
 * (sin tabla Schedule, sin columna schedulesMigrated) — replica el
 * estado de la BD de producción en el volumen Docker.
 *
 * Uso: DATABASE_URL="file:/tmp/test-viejo.db" bun test-migrate.mts
 */
import { PrismaClient } from '@prisma/client';
import { runMigrations } from './src/lib/migrate';

const db = new PrismaClient();

async function main() {
  // 1. Crear esquema VIEJO (como la BD de producción actual)
  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "Schedule"`);
  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "Program"`);
  await db.$executeRawUnsafe(`
    CREATE TABLE "Program" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "host" TEXT,
      "description" TEXT,
      "dayOfWeek" INTEGER NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "imageUrl" TEXT,
      "playerImageUrl" TEXT,
      "genre" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);

  // 2. Datos de prueba: el caso real del usuario (mismo show, días y horas distintas)
  const ins = (id: string, name: string, day: number, start: string, end: string) =>
    db.$executeRawUnsafe(
      `INSERT INTO "Program" ("id","name","dayOfWeek","startTime","endTime","isActive","sortOrder","updatedAt") VALUES (?, ?, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP)`,
      id, name, day, start, end
    );
  await ins('p1', 'Noticiero Campesino', 1, '07:00', '08:00'); // Lun 7am
  await ins('p2', 'Noticiero Campesino', 3, '07:00', '08:00'); // Mié 7am (duplicado legacy)
  await ins('p3', 'Noticiero Campesino', 2, '12:30', '13:00'); // Mar 12:30 — hora distinta!
  await ins('p4', 'Sabor Vallenato', 6, '18:00', '20:00');     // Sáb 2h
  await ins('p5', 'Cruce Noche', 5, '23:30', '00:30');         // cruza medianoche
  await ins('p6', 'Alba Llanera', 0, '05:00', '05:00');        // end<=start → 24h

  // 3. Ejecutar migración
  await runMigrations(db);

  // 4. Verificar
  const programs = await db.$queryRawUnsafe<{ id: string; name: string; schedulesMigrated: number }[]>(
    `SELECT "id","name","schedulesMigrated" FROM "Program" ORDER BY "name","id"`
  );
  const schedules = await db.$queryRawUnsafe<{ programId: string; dayOfWeek: number; startTime: string; durationMin: number; isRerun: number }[]>(
    `SELECT "programId","dayOfWeek","startTime","durationMin","isRerun" FROM "Schedule" ORDER BY "programId","dayOfWeek","startTime"`
  );

  console.log('--- PROGRAMAS (esperados: 4, todos schedulesMigrated=1) ---');
  console.log(JSON.stringify(programs, null, 0));
  console.log('--- SCHEDULES (esperados: 6) ---');
  console.log(JSON.stringify(schedules, null, 0));

  const progs = programs.length;
  const schs = schedules.length;
  const migrated = programs.every(p => p.schedulesMigrated === 1 || p.schedulesMigrated === true);
  const p1 = schedules.filter(s => s.programId === 'p1');
  const p1ok = p1.length === 3 && p1.some(s => s.dayOfWeek === 2 && s.startTime === '12:30' && s.durationMin === 30);
  const p4ok = schedules.some(s => s.programId === 'p4' && s.durationMin === 120);
  const p5ok = schedules.some(s => s.programId === 'p5' && s.durationMin === 60); // 23:30→00:30 cruza
  const p6ok = schedules.some(s => s.programId === 'p6' && s.durationMin === 1440); // 24h cap

  // 5. Idempotencia: segunda ejecución no duplica
  await runMigrations(db);
  const schs2 = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*) as n FROM "Schedule"`);
  const progs2 = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*) as n FROM "Program"`);

  const ok = progs === 4 && schs === 6 && migrated && p1ok && p4ok && p5ok && p6ok
    && Number(schs2[0].n) === 6 && Number(progs2[0].n) === 4;
  console.log('--- RESULTADO ---');
  console.log(`programas=${progs}/4 schedules=${schs}/6 migrados=${migrated} p1(3 slots, impar/par)=${p1ok} p4(120m)=${p4ok} p5(cruce 60m)=${p5ok} p6(24h)=${p6ok} idempotente=${Number(schs2[0].n) === 6 && Number(progs2[0].n) === 4}`);
  console.log(ok ? '✅ MIGRACIÓN OK' : '❌ MIGRACIÓN FALLÓ');
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
