import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const allSections = await db.sections.all();
  const original = allSections.find(s => s.id === id);
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Collect this section + all descendants
  const toCopy: typeof allSections = [];
  const queue = [original];
  while (queue.length) {
    const cur = queue.shift()!;
    toCopy.push(cur);
    allSections.filter(s => s.parentId === cur.id).forEach(s => queue.push(s));
  }

  const idMap = new Map<string, string>();
  toCopy.forEach(s => idMap.set(s.id, uuid()));

  const maxOrder = allSections.filter(s => s.parentId === original.parentId).reduce((max, s) => Math.max(max, s.order), -1);

  const newSections = toCopy.map(s => ({
    ...s,
    id: idMap.get(s.id)!,
    name: s.id === original.id ? `${s.name} (copie)` : s.name,
    order: s.id === original.id ? maxOrder + 1 : s.order,
    parentId: s.id === original.id ? original.parentId : (idMap.get(s.parentId!) ?? null),
  }));

  const copiedSectionIds = new Set(toCopy.map(s => s.id));
  const oldModules = (await db.modules.all()).filter(m => copiedSectionIds.has(m.sectionId));
  const newModules = oldModules.map(m => ({
    ...m,
    id: uuid(),
    sectionId: idMap.get(m.sectionId)!,
    createdAt: new Date().toISOString(),
  }));

  await db.sections.save([...allSections, ...newSections]);
  await db.modules.save([...(await db.modules.all()), ...newModules]);

  return NextResponse.json(newSections.find(s => s.id === idMap.get(original.id)), { status: 201 });
}
