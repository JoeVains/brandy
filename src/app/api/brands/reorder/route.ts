import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: string[] };
  const brands = await db.brands.all();
  const map = Object.fromEntries(brands.map(b => [b.id, b]));
  const reordered = ids.map(id => map[id]).filter(Boolean);
  await db.brands.save(reordered);
  return NextResponse.json({ ok: true });
}
