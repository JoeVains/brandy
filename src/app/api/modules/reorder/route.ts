import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { sectionId, ids } = await req.json() as { sectionId: string; ids: string[] };
  const all = db.modules.all();
  ids.forEach((id, index) => {
    const m = all.find(x => x.id === id && x.sectionId === sectionId);
    if (m) m.order = index;
  });
  db.modules.save(all);
  return NextResponse.json({ ok: true });
}
