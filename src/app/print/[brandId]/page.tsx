import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Module } from '@/types';
import PrintClient from './PrintClient';

export default async function PrintPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = (await db.brands.all()).find(b => b.id === brandId);
  if (!brand) return notFound();

  const allSections = (await db.sections.all()).filter(s => s.brandId === brandId).sort((a, b) => a.order - b.order);
  const allModules = (await db.modules.all()).filter(m => m.brandId === brandId).sort((a, b) => a.order - b.order);

  // Build tree: roots first, then children
  const roots = allSections.filter(s => s.parentId === null);

  function collectSections(parentId: string | null): typeof allSections {
    const children = allSections.filter(s => s.parentId === parentId).sort((a, b) => a.order - b.order);
    return children.flatMap(s => [s, ...collectSections(s.id)]);
  }

  const orderedSections = collectSections(null);
  const modulesMap: Record<string, Module[]> = {};
  for (const s of orderedSections) {
    modulesMap[s.id] = allModules.filter(m => m.sectionId === s.id).sort((a, b) => a.order - b.order);
  }

  return <PrintClient brand={brand} sections={orderedSections} modulesMap={modulesMap} />;
}
