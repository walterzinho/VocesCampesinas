/**
 * Rate limiter en memoria (sliding window por clave).
 *
 * Suficiente para un despliegue de un solo contenedor (Docker + Caddy).
 * Si algún día escalas a varias instancias, cámbialo por Redis
 * (p. ej. @upstash/ratelimit) — la interfaz es la misma.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
}

/**
 * @param key         Identificador único, p. ej. `login:1.2.3.4` o `request:5.6.7.8`
 * @param maxRequests Máximo de peticiones dentro de la ventana
 * @param windowMs    Tamaño de la ventana en milisegundos
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0, remaining: maxRequests - 1 };
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: maxRequests - bucket.count,
  };
}

/**
 * Extrae la IP real del cliente detrás de Caddy/Nginx.
 */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'desconocida';
}
