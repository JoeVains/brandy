import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';
import { deleteFile } from '@/lib/files';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const all = await db.modules.all();
  const idx = all.findIndex(m => m.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const prev = all[idx];
  all[idx] = { ...prev, ...body };
  await db.modules.save(all);

  const brand = (await db.brands.all()).find(b => b.id === prev.brandId);
  const section = (await db.sections.all()).find(s => s.id === prev.sectionId);
  await logHistory({ action: 'module.edit', brandName: brand?.name, sectionName: section?.name, entityName: prev.title || prev.type, entityType: prev.type });

  return NextResponse.json(all[idx]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await db.modules.all();
  const module = all.find(m => m.id === id);
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete associated files
  const filesToDelete: string[] = [];
  if (module.imageFilename) filesToDelete.push(module.imageFilename);
  if (module.fontItems) module.fontItems.forEach(f => { if (f.filename) filesToDelete.push(f.filename); });
  if (module.attachmentItems) module.attachmentItems.forEach(a => filesToDelete.push(a.filename));
  if (module.videoFilename) filesToDelete.push(module.videoFilename);
  if (module.audioFilename) filesToDelete.push(module.audioFilename);

  await Promise.all(filesToDelete.map(deleteFile));

  await db.modules.save(all.filter(m => m.id !== id));

  const brand = (await db.brands.all()).find(b => b.id === module.brandId);
  const section = (await db.sections.all()).find(s => s.id === module.sectionId);
  await logHistory({ action: 'module.delete', brandName: brand?.name, sectionName: section?.name, entityName: module.title || module.type, entityType: module.type });

  return NextResponse.json({ ok: true });
}
