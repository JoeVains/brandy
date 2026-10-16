import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordDownloads } from '@/lib/stats';

// Route publique (utilisée aussi depuis les pages partagées) : on n'enregistre que des éléments qui existent vraiment.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { moduleId?: string; itemIds?: unknown; bulk?: boolean } | null;
  if (!body?.moduleId || !Array.isArray(body.itemIds)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const module = (await db.modules.all()).find(m => m.id === body.moduleId);
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const valid = new Set<string>([
    ...(module.iconItems ?? []).map(i => i.id),
    ...(module.imageItems ?? []).map(i => i.id),
    ...(module.attachmentItems ?? []).map(i => i.id),
    ...(module.fontItems ?? []).map(i => i.id),
    ...(module.imageFilename ? ['__single'] : []),
  ]);
  const ids = body.itemIds.filter((id): id is string => typeof id === 'string' && valid.has(id)).slice(0, 500);
  await recordDownloads(module.id, ids, body.bulk === true);
  return NextResponse.json({ ok: true, recorded: ids.length });
}
