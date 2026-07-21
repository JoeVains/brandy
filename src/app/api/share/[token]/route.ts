import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brand = db.brands.all().find(b => b.shareToken === token);
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sections = db.sections.all().filter(s => s.brandId === brand.id);
  const modules = db.modules.all().filter(m => m.brandId === brand.id);

  return NextResponse.json({ brand, sections, modules });
}
