import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const brand = (await db.brands.all()).find(b => b.id === id);
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const newBrandId = uuid();
  const newBrand = {
    ...brand,
    id: newBrandId,
    name: `${brand.name} (copie)`,
    createdAt: new Date().toISOString(),
  };

  // Deep copy sections with new IDs, preserving hierarchy
  const oldSections = (await db.sections.all()).filter(s => s.brandId === id);
  const sectionIdMap = new Map<string, string>();
  oldSections.forEach(s => sectionIdMap.set(s.id, uuid()));

  const newSections = oldSections.map(s => ({
    ...s,
    id: sectionIdMap.get(s.id)!,
    brandId: newBrandId,
    parentId: s.parentId ? (sectionIdMap.get(s.parentId) ?? null) : null,
  }));

  // Deep copy modules with new IDs
  const oldSectionIds = new Set(oldSections.map(s => s.id));
  const oldModules = (await db.modules.all()).filter(m => oldSectionIds.has(m.sectionId));

  const newModules = oldModules.map(m => ({
    ...m,
    id: uuid(),
    brandId: newBrandId,
    sectionId: sectionIdMap.get(m.sectionId)!,
    createdAt: new Date().toISOString(),
  }));

  await db.brands.save([...(await db.brands.all()), newBrand]);
  await db.sections.save([...(await db.sections.all()), ...newSections]);
  await db.modules.save([...(await db.modules.all()), ...newModules]);

  return NextResponse.json(newBrand, { status: 201 });
}
