import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const categories = (await db.brandCategories.all()).map(c => c.id === id ? { ...c, ...updates } : c);
  await db.brandCategories.save(categories);
  return NextResponse.json(categories.find(c => c.id === id));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.brandCategories.save((await db.brandCategories.all()).filter(c => c.id !== id));
  const brands = (await db.brands.all()).map(b => b.categoryId === id ? { ...b, categoryId: null } : b);
  await db.brands.save(brands);
  return NextResponse.json({ ok: true });
}
