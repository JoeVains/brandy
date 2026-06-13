import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Module } from '@/types';
import { randomUUID } from 'crypto';
import { logHistory } from '@/lib/history';

export async function GET(req: NextRequest) {
  const sectionId = req.nextUrl.searchParams.get('sectionId');
  const all = db.modules.all();
  const filtered = sectionId ? all.filter(m => m.sectionId === sectionId) : all;
  return NextResponse.json(filtered.sort((a, b) => a.order - b.order));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sectionId, brandId, type, title } = body;
  const all = db.modules.all();
  const sectionModules = all.filter(m => m.sectionId === sectionId);
  const order = sectionModules.length > 0 ? Math.max(...sectionModules.map(m => m.order)) + 1 : 0;

  const module: Module = {
    id: randomUUID(),
    sectionId,
    brandId,
    type,
    title: title ?? '',
    order,
    createdAt: new Date().toISOString(),
  };

  if (type === 'colors') module.colorItems = [];
  if (type === 'typography') module.fontItems = [];
  if (type === 'attachments') module.attachmentItems = [];
  if (type === 'text') module.content = '';
  if (type === 'icons') module.iconItems = [];

  db.modules.save([...all, module]);

  const brand = db.brands.all().find(b => b.id === brandId);
  const section = db.sections.all().find(s => s.id === sectionId);
  logHistory({ action: 'module.create', brandName: brand?.name, sectionName: section?.name, entityName: title ?? type, entityType: type });

  return NextResponse.json(module);
}
