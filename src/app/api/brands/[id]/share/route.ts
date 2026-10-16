import { countSince, deleteShareViews, readShareViews } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { parseExpiry } from '@/lib/share';

// Consultations du lien de partage : total, 7 et 30 derniers jours, dernière visite.
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = (await db.brands.all()).find(b => b.id === id);
  if (!brand?.shareToken) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const stat = await readShareViews(brand.shareToken);
  return NextResponse.json({ total: stat?.total ?? 0, last7: countSince(stat ?? undefined, 7), last30: countSince(stat ?? undefined, 30), last: stat?.last || null });
}

// Crée le lien (ou le conserve) avec une date d'expiration optionnelle : { expiresAt: ISO | null }.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const expiresAt = 'expiresAt' in body ? parseExpiry(body.expiresAt) : null;
  if (expiresAt === undefined) return NextResponse.json({ error: 'Invalid expiry' }, { status: 400 });

  brands[idx] = { ...brands[idx], shareToken: brands[idx].shareToken ?? randomUUID(), shareExpiresAt: expiresAt };
  await db.brands.save(brands);
  return NextResponse.json(brands[idx]);
}

// Modifie la date d'expiration d'un lien existant (prolonger, raccourcir, retirer) sans changer l'adresse.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1 || !brands[idx].shareToken) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const expiresAt = parseExpiry(body.expiresAt);
  if (expiresAt === undefined) return NextResponse.json({ error: 'Invalid expiry' }, { status: 400 });

  brands[idx] = { ...brands[idx], shareExpiresAt: expiresAt };
  await db.brands.save(brands);
  return NextResponse.json(brands[idx]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (brands[idx].shareToken) await deleteShareViews(brands[idx].shareToken);
  brands[idx] = { ...brands[idx], shareToken: undefined, shareExpiresAt: undefined };
  await db.brands.save(brands);
  return NextResponse.json(brands[idx]);
}
