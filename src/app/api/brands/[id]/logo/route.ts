import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveFile, deleteFile } from '@/lib/files';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const old = brands[idx].logoImage;
  if (old) await deleteFile(old);

  const ext = file.name.split('.').pop() ?? 'png';
  const filename = `${randomUUID()}.${ext}`;
  await saveFile(filename, await file.arrayBuffer(), file.type || 'application/octet-stream');

  brands[idx] = { ...brands[idx], logoImage: filename };
  await db.brands.save(brands);
  return NextResponse.json(brands[idx]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const old = brands[idx].logoImage;
  if (old) await deleteFile(old);

  brands[idx] = { ...brands[idx], logoImage: undefined };
  await db.brands.save(brands);
  return NextResponse.json(brands[idx]);
}
