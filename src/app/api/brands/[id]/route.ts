import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allBrands = await db.brands.all();
  const deleted = allBrands.find(b => b.id === id);
  const brands = allBrands.filter(b => b.id !== id);
  await db.brands.save(brands);
  if (deleted) await logHistory({ action: 'brand.delete', brandName: deleted.name, entityName: deleted.name });
  // clean up sections and assets for this brand
  await db.sections.save((await db.sections.all()).filter(s => s.brandId !== id));
  await db.assets.save((await db.assets.all()).filter(a => a.brandId !== id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const brands = (await db.brands.all()).map(b => b.id === id ? { ...b, ...updates } : b);
  await db.brands.save(brands);
  const updated = brands.find(b => b.id === id);
  if (updated) await logHistory({ action: 'brand.edit', brandName: updated.name, entityName: updated.name });
  return NextResponse.json(updated);
}
