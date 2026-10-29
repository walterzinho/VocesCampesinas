import { db } from './db';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Autenticación centralizada del panel admin.
 *
 * - Contraseña hasheada con scrypt (node:crypto, cero dependencias)
 * - Comparación timing-safe (evita ataques de temporización)
 * - Auto-migración: si la contraseña está en texto plano en la BD,
 *   se re-hashea automáticamente en el primer login correcto.
 *
 * Formato almacenado:  scrypt:<salt-hex>:<hash-hex>
 */

const SCRYPT_PREFIX = 'scrypt:';
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${SCRYPT_PREFIX}${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  if (stored.startsWith(SCRYPT_PREFIX)) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    const candidate = scryptSync(password, salt, KEY_LEN);
    const expected = Buffer.from(hash, 'hex');
    return (
      candidate.length === expected.length && timingSafeEqual(candidate, expected)
    );
  }

  // Formato legado (texto plano): comparación timing-safe igualmente
  const a = Buffer.from(password);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifica una contraseña contra la BD y auto-migra a hash si estaba plana.
 */
export async function verifyPasswordAgainstDb(password: string): Promise<boolean> {
  const setting = await db.settings.findUnique({ where: { key: 'adminPassword' } });
  if (!setting?.value) return false;

  if (!verifyPassword(password, setting.value)) return false;

  // Auto-upgrade: texto plano -> scrypt
  if (!setting.value.startsWith(SCRYPT_PREFIX)) {
    try {
      await db.settings.update({
        where: { key: 'adminPassword' },
        data: { value: hashPassword(password) },
      });
      await db.adminLog.create({
        data: {
          action: 'SECURITY',
          detail: 'Contraseña admin migrada automáticamente a hash scrypt',
        },
      });
    } catch {
      // la migración es best-effort; el login ya es válido
    }
  }
  return true;
}

/**
 * Verifica el header Authorization: Bearer <password> de una request admin.
 * Reemplaza las copias locales de verifyAdmin en cada route.ts.
 */
export async function verifyAdmin(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  return verifyPasswordAgainstDb(authHeader.slice('Bearer '.length));
}
