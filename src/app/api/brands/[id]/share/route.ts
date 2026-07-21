import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  brands[idx] = { ...brands[idx], shareToken: brands[idx].shareToken ?? randomUUID() };
  db.brands.save(brands);
  return NextResponse.json(brands[idx]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  brands[idx] = { ...brands[idx], shareToken: undefined };
  db.brands.save(brands);
  return NextResponse.json(brands[idx]);
}
