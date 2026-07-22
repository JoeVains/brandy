import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allSections = await db.sections.all();

  // collect section + all descendants
  const toDelete = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    toDelete.add(cur);
    allSections.filter(s => s.parentId === cur).forEach(s => queue.push(s.id));
  }

  const deleted = allSections.find(s => s.id === id);
  await db.sections.save(allSections.filter(s => !toDelete.has(s.id)));
  await db.assets.save((await db.assets.all()).filter(a => !toDelete.has(a.sectionId)));
  if (deleted) {
    const brand = (await db.brands.all()).find(b => b.id === deleted.brandId);
    await logHistory({ action: 'section.delete', brandName: brand?.name, entityName: deleted.name });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const allSections = await db.sections.all();
  const prev = allSections.find(s => s.id === id);
  const sections = allSections.map(s => s.id === id ? { ...s, ...updates } : s);
  await db.sections.save(sections);
  if (prev && updates.name) {
    const brand = (await db.brands.all()).find(b => b.id === prev.brandId);
    await logHistory({ action: 'section.edit', brandName: brand?.name, entityName: updates.name });
  }
  return NextResponse.json(sections.find(s => s.id === id));
}
