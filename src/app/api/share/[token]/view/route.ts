import { NextRequest, NextResponse } from 'next/server';
import { resolveShare } from '@/lib/share';
import { recordShareView } from '@/lib/stats';

// Appelée une fois par visite (la page partagée mémorise la session). Un lien expiré ou inconnu n'est pas compté.
export async function POST(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await resolveShare(token);
  if ('error' in share) return NextResponse.json({ error: share.error }, { status: share.status });
  await recordShareView(token);
  return NextResponse.json({ ok: true });
}
