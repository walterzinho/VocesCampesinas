import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// TEMPORAL — ejecutar una vez y eliminar
export async function GET() {
  try {
    // Agregar columna playerImageUrl a Program
    await db.$executeRawUnsafe(`
      ALTER TABLE Program ADD COLUMN playerImageUrl TEXT
    `).catch(() => { /* ya existe */ });

    return NextResponse.json({ ok: true, message: 'Migración completada: playerImageUrl agregado' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}