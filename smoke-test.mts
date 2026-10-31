/**
 * Smoke test end-to-end: levanta el servidor dev con una BD nueva,
 * ejercita la API de programas multi-horario y la página principal.
 *
 * Uso: bun smoke-test.mts   (desde la raíz del repo)
 */
import { PrismaClient } from '@prisma/client';
import { spawn, execSync } from 'child_process';

const BASE = 'http://localhost:3111';
const PASS = 'test12345';
const db = new PrismaClient({ datasources: { db: { url: 'file:/tmp/smoke.db' } } });

async function waitForServer(tries = 60): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/api/settings`);
      if (r.ok) return true;
    } catch { /* aún no */ }
    await new Promise(res => setTimeout(res, 1000));
  }
  return false;
}

async function main() {
  // BD nueva con el esquema nuevo (como hace el Dockerfile en el build)
  execSync('bunx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:/tmp/smoke.db' },
    stdio: 'pipe',
  });
  await db.$queryRawUnsafe(`SELECT 1`);
  // Sembrar contraseña admin (texto plano: auth la auto-migra a scrypt)
  await db.$executeRawUnsafe(
    `INSERT INTO "Settings" ("id","key","value") VALUES ('s1','adminPassword',?)`,
    PASS
  );

  const server = spawn('bun', ['x', 'next', 'dev', '-p', '3111'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: 'file:/tmp/smoke.db' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logbuf = '';
  server.stdout.on('data', (d) => { logbuf += d.toString(); });
  server.stderr.on('data', (d) => { logbuf += d.toString(); });

  const results: string[] = [];
  const check = (name: string, ok: boolean, extra = '') =>
    results.push(`${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);

  try {
    const up = await waitForServer();
    check('servidor arriba', up);
    if (!up) throw new Error(logbuf.slice(-3000));

    // 1. GET público vacío
    let r = await fetch(`${BASE}/api/programs/all`);
    const empty = await r.json();
    check('GET /api/programs/all inicial = []', r.ok && Array.isArray(empty) && empty.length === 0);

    // 2. POST con 3 horarios (caso impar/par) + 1 reemisión
    r = await fetch(`${BASE}/api/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PASS}` },
      body: JSON.stringify({
        name: 'Noticiero Test',
        host: 'Walter',
        genre: 'Informativo',
        schedules: [
          { dayOfWeek: 1, startTime: '07:00', durationMin: 60, isRerun: false },
          { dayOfWeek: 2, startTime: '12:30', durationMin: 30, isRerun: false },
          { dayOfWeek: 1, startTime: '19:00', durationMin: 60, isRerun: true },
        ],
      }),
    });
    const created = await r.json();
    check('POST con 3 horarios', r.status === 201 && created.schedules?.length === 3,
      `status=${r.status} schedules=${created.schedules?.length}`);
    const progId = created.id;

    // 3. GET público devuelve el programa con horarios ordenados
    r = await fetch(`${BASE}/api/programs/all`);
    const list = await r.json();
    const prog = Array.isArray(list) ? list.find((p: { id: string }) => p.id === progId) : null;
    check('GET all devuelve programa con 3 horarios', !!prog && prog.schedules.length === 3);
    check('espejo legacy del primer horario', prog?.startTime === '07:00' && prog?.endTime === '08:00' && prog?.dayOfWeek === 1);

    // 4. PUT reemplaza horarios (agrega 4to, uno reemisión)
    r = await fetch(`${BASE}/api/programs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PASS}` },
      body: JSON.stringify({
        id: progId,
        name: 'Noticiero Test',
        schedules: [
          { dayOfWeek: 1, startTime: '07:00', durationMin: 60, isRerun: false },
          { dayOfWeek: 2, startTime: '12:30', durationMin: 30, isRerun: false },
          { dayOfWeek: 4, startTime: '07:00', durationMin: 60, isRerun: false },
          { dayOfWeek: 1, startTime: '21:00', durationMin: 45, isRerun: true },
        ],
      }),
    });
    const updated = await r.json();
    check('PUT reemplaza a 4 horarios', r.ok && updated.schedules?.length === 4,
      `schedules=${updated.schedules?.length}`);

    // 5. Validación: hora inválida rechazada (se ignora → 400 por falta de schedules válidos)
    r = await fetch(`${BASE}/api/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PASS}` },
      body: JSON.stringify({ name: 'Malo', schedules: [{ dayOfWeek: 9, startTime: '99:99', durationMin: 60 }] }),
    });
    check('hora inválida rechazada (400)', r.status === 400, `status=${r.status}`);

    // 6. Sin autenticación → 401
    r = await fetch(`${BASE}/api/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hack', schedules: [{ dayOfWeek: 1, startTime: '07:00', durationMin: 60 }] }),
    });
    check('POST sin auth = 401', r.status === 401);

    // 7. DELETE borra programa + horarios
    r = await fetch(`${BASE}/api/programs?id=${progId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${PASS}` },
    });
    const after = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) as n FROM "Schedule"`);
    check('DELETE programa y sus horarios', r.ok && Number(after[0].n) === 0);

    // 8. Página principal carga
    r = await fetch(BASE);
    const html = await r.text();
    check('GET / devuelve 200 con HTML', r.ok && html.includes('Voces Campesinas'));

    // 9. Migración runtime corrió sin romper (idempotente en BD nueva)
    const logs = logbuf.includes('[migrate]') ? 'sí' : 'no requirió';
    check('migración runtime no rompió el arranque', true, `mensajes: ${logs}`);
  } catch (e) {
    check('EXCEPCIÓN', false, String(e).slice(0, 200));
  }

  console.log('\n===== SMOKE TEST =====');
  for (const line of results) console.log(line);
  const failed = results.filter(r => r.startsWith('❌')).length;
  console.log(failed === 0 ? '✅ TODO OK' : `❌ ${failed} fallos`);

  server.kill('SIGTERM');
  await db.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main();
