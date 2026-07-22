import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteFile } from '@/lib/files';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const assets = (await db.assets.all()).map(a => a.id === id ? { ...a, ...updates } : a);
  await db.assets.save(assets);
  return NextResponse.json(assets.find(a => a.id === id));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assets = await db.assets.all();
  const asset = assets.find(a => a.id === id);
  if (asset?.filename) await deleteFile(asset.filename);
  await db.assets.save(assets.filter(a => a.id !== id));
  return NextResponse.json({ ok: true });
}
