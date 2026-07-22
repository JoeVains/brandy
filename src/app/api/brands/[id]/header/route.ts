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

  const old = brands[idx].headerImage;
  if (old) await deleteFile(old);

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  await saveFile(filename, await file.arrayBuffer(), file.type || 'image/jpeg');

  brands[idx] = { ...brands[idx], headerImage: filename };
  await db.brands.save(brands);

  return NextResponse.json(brands[idx]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'No url' }, { status: 400 });

  let buffer: ArrayBuffer;
  let contentType = 'image/jpeg';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    contentType = res.headers.get('content-type') || contentType;
    buffer = await res.arrayBuffer();
  } catch {
    return NextResponse.json({ error: 'Could not fetch image' }, { status: 400 });
  }

  const old = brands[idx].headerImage;
  if (old) await deleteFile(old);

  const ext = url.split('?')[0].split('.').pop()?.replace(/[^a-z]/gi, '') || 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  await saveFile(filename, buffer, contentType);

  brands[idx] = { ...brands[idx], headerImage: filename };
  await db.brands.save(brands);

  return NextResponse.json(brands[idx]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const old = brands[idx].headerImage;
  if (old) await deleteFile(old);

  brands[idx] = { ...brands[idx], headerImage: undefined };
  await db.brands.save(brands);

  return NextResponse.json(brands[idx]);
}
