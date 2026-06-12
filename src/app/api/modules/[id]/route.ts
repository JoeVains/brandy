import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const all = db.modules.all();
  const idx = all.findIndex(m => m.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  all[idx] = { ...all[idx], ...body };
  db.modules.save(all);
  return NextResponse.json(all[idx]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = db.modules.all();
  const module = all.find(m => m.id === id);
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  // Delete associated files
  const filesToDelete: string[] = [];
  if (module.imageFilename) filesToDelete.push(module.imageFilename);
  if (module.fontItems) module.fontItems.forEach(f => { if (f.filename) filesToDelete.push(f.filename); });
  if (module.attachmentItems) module.attachmentItems.forEach(a => filesToDelete.push(a.filename));

  filesToDelete.forEach(filename => {
    const p = path.join(uploadsDir, filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  db.modules.save(all.filter(m => m.id !== id));
  return NextResponse.json({ ok: true });
}
