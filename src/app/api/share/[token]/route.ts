import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveShare } from '@/lib/share';

// Pas de mise en cache : un lien expiré (410) puis prolongé doit fonctionner immédiatement.
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await resolveShare(token);
  if ('error' in share) return NextResponse.json({ error: share.error }, { status: share.status, headers: NO_STORE });
  const { brand } = share;

  const sections = (await db.sections.all()).filter(s => s.brandId === brand.id);
  const modules = (await db.modules.all()).filter(m => m.brandId === brand.id);

  return NextResponse.json({ brand, sections, modules }, { headers: NO_STORE });
}
