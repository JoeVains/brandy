import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = db.brands.all().find(b => b.id === id);
  const brands = db.brands.all().filter(b => b.id !== id);
  db.brands.save(brands);
  if (deleted) logHistory({ action: 'brand.delete', brandName: deleted.name, entityName: deleted.name });
  // clean up sections and assets for this brand
  db.sections.save(db.sections.all().filter(s => s.brandId !== id));
  db.assets.save(db.assets.all().filter(a => a.brandId !== id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const brands = db.brands.all().map(b => b.id === id ? { ...b, ...updates } : b);
  db.brands.save(brands);
  const updated = brands.find(b => b.id === id);
  if (updated) logHistory({ action: 'brand.edit', brandName: updated.name, entityName: updated.name });
  return NextResponse.json(updated);
}
