import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: string[] };
  const sections = (await db.sections.all()).map(s => {
    const idx = ids.indexOf(s.id);
    return idx === -1 ? s : { ...s, order: idx };
  });
  await db.sections.save(sections);
  return NextResponse.json({ ok: true });
}
