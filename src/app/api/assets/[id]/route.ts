import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const assets = db.assets.all().map(a => a.id === id ? { ...a, ...updates } : a);
  db.assets.save(assets);
  return NextResponse.json(assets.find(a => a.id === id));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assets = db.assets.all();
  const asset = assets.find(a => a.id === id);
  if (asset?.filename) {
    const filePath = path.join(process.cwd(), 'public', 'uploads', asset.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.assets.save(assets.filter(a => a.id !== id));
  return NextResponse.json({ ok: true });
}
