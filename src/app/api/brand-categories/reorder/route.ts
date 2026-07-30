import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: string[] };
  const categories = await db.brandCategories.all();
  const map = Object.fromEntries(categories.map(c => [c.id, c]));
  const reordered = ids.map(id => map[id]).filter(Boolean);
  await db.brandCategories.save(reordered);
  return NextResponse.json({ ok: true });
}
