import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  return NextResponse.json(db.brands.all());
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json();
  const brands = db.brands.all();
  const brand = { id: uuid(), name, color: color || '#6366f1', createdAt: new Date().toISOString() };
  db.brands.save([...brands, brand]);
  return NextResponse.json(brand, { status: 201 });
}
