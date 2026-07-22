import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get('brandId');
  const sections = await db.sections.all();
  return NextResponse.json(brandId ? sections.filter(s => s.brandId === brandId) : sections);
}

export async function POST(req: NextRequest) {
  const { brandId, name, parentId } = await req.json();
  const sections = await db.sections.all();
  const siblings = sections.filter(s => s.brandId === brandId && s.parentId === (parentId ?? null));
  const section = { id: uuid(), brandId, name, parentId: parentId ?? null, order: siblings.length };
  await db.sections.save([...sections, section]);
  const brand = (await db.brands.all()).find(b => b.id === brandId);
  await logHistory({ action: 'section.create', brandName: brand?.name, entityName: name });
  return NextResponse.json(section, { status: 201 });
}
