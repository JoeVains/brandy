import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  return NextResponse.json(await db.brandCategories.all());
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json();
  const categories = await db.brandCategories.all();
  const category = { id: uuid(), name: name || 'Nouvelle catégorie', color: color || '#6b7280' };
  await db.brandCategories.save([...categories, category]);
  return NextResponse.json(category, { status: 201 });
}
