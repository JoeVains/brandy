import { createHash, timingSafeEqual } from 'crypto';

export const AUTH_COOKIE = 'brandy_auth';

export function expectedAuthValue(): string | null {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return createHash('sha256').update(password).digest('hex');
}

export function isValidAuthCookie(value: string | undefined): boolean {
  const expected = expectedAuthValue();
  if (!expected || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
