import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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
