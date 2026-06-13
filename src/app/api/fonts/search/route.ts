import { NextRequest, NextResponse } from 'next/server';

let cachedFonts: string[] | null = null;

async function getFontList(): Promise<string[]> {
  if (cachedFonts) return cachedFonts;
  const res = await fetch('https://fonts.google.com/metadata/fonts', {
    next: { revalidate: 86400 },
  });
  const data = await res.json();
  cachedFonts = (data.familyMetadataList as { family: string }[]).map(f => f.family);
  return cachedFonts;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() ?? '';
  if (q.length < 2) return NextResponse.json([]);
  try {
    const fonts = await getFontList();
    const matches = fonts.filter(f => f.toLowerCase().includes(q)).slice(0, 8);
    return NextResponse.json(matches);
  } catch {
    return NextResponse.json([]);
  }
}
