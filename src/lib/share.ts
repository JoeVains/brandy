import { db } from './db';
import type { Brand } from '@/types';

export function isExpired(brand: Pick<Brand, 'shareExpiresAt'>): boolean {
  return !!brand.shareExpiresAt && new Date(brand.shareExpiresAt).getTime() <= Date.now();
}

// Marque associée à un jeton de partage, ou une raison de refus (inconnu / expiré).
export async function resolveShare(token: string): Promise<{ brand: Brand } | { error: 'not-found' | 'expired'; status: 404 | 410 }> {
  const brand = (await db.brands.all()).find(b => b.shareToken === token);
  if (!brand) return { error: 'not-found', status: 404 };
  if (isExpired(brand)) return { error: 'expired', status: 410 };
  return { brand };
}

// Date d'expiration valide et dans le futur, ou null (sans expiration). `undefined` si la valeur est invalide.
export function parseExpiry(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const t = new Date(value).getTime();
  return isNaN(t) || t <= Date.now() ? undefined : new Date(t).toISOString();
}
