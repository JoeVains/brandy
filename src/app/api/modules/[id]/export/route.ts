import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ColorItem } from '@/types';

function toVarName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'color';
}

function hexToRgbFloat(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function generateLess(colors: ColorItem[], title: string): string {
  const lines = [`// ${title}`, ''];
  for (const c of colors) {
    lines.push(`@${toVarName(c.name)}: ${c.value.toUpperCase()};`);
  }
  return lines.join('\n');
}

function generateScss(colors: ColorItem[], title: string): string {
  const lines = [`// ${title}`, ''];
  for (const c of colors) {
    lines.push(`$${toVarName(c.name)}: ${c.value.toUpperCase()};`);
  }
  return lines.join('\n');
}

function generateAse(colors: ColorItem[], title: string): Buffer {
  // Build color blocks first to know total count
  const blocks: Buffer[] = [];

  // Optional group block wrapping all colors
  const groupNameBuf = encodeUtf16BE(title);
  const groupStart = Buffer.alloc(2 + 4 + groupNameBuf.length);
  groupStart.writeUInt16BE(0xc001, 0); // group start
  groupStart.writeUInt32BE(groupNameBuf.length, 2);
  groupNameBuf.copy(groupStart, 6);
  blocks.push(groupStart);

  for (const c of colors) {
    const nameBuf = encodeUtf16BE(c.name);
    const [r, g, b] = hexToRgbFloat(c.value);
    // block length = nameBuf + "RGB " (4) + 3 floats (12) + color type (2)
    const blockLen = nameBuf.length + 4 + 12 + 2;
    const block = Buffer.alloc(2 + 4 + blockLen);
    let offset = 0;
    block.writeUInt16BE(0x0001, offset); offset += 2; // color entry
    block.writeUInt32BE(blockLen, offset); offset += 4;
    nameBuf.copy(block, offset); offset += nameBuf.length;
    block.write('RGB ', offset, 'ascii'); offset += 4;
    block.writeFloatBE(r, offset); offset += 4;
    block.writeFloatBE(g, offset); offset += 4;
    block.writeFloatBE(b, offset); offset += 4;
    block.writeUInt16BE(0x0000, offset); // global
    blocks.push(block);
  }

  // Group end
  const groupEnd = Buffer.alloc(6);
  groupEnd.writeUInt16BE(0xc002, 0);
  groupEnd.writeUInt32BE(0, 2);
  blocks.push(groupEnd);

  const header = Buffer.alloc(12);
  header.write('ASEF', 0, 'ascii');
  header.writeUInt32BE(0x00010000, 4); // version 1.0
  header.writeUInt32BE(blocks.length, 8); // block count

  return Buffer.concat([header, ...blocks]);
}

function encodeUtf16BE(str: string): Buffer {
  // name length (uint16) + chars in UTF-16 BE + null terminator
  const len = str.length + 1; // +1 for null
  const buf = Buffer.alloc(2 + len * 2);
  buf.writeUInt16BE(len, 0);
  for (let i = 0; i < str.length; i++) {
    buf.writeUInt16BE(str.charCodeAt(i), 2 + i * 2);
  }
  buf.writeUInt16BE(0, 2 + str.length * 2); // null terminator
  return buf;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const module = db.modules.all().find(m => m.id === id);
  if (!module || module.type !== 'colors') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get('format') ?? 'scss';
  const colors = module.colorItems ?? [];
  const title = module.title || 'Colors';
  const slug = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (format === 'less') {
    return new NextResponse(generateLess(colors, title), {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${slug}.less"`,
      },
    });
  }

  if (format === 'scss') {
    return new NextResponse(generateScss(colors, title), {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${slug}.scss"`,
      },
    });
  }

  if (format === 'ase') {
    const buf = generateAse(colors, title);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${slug}.ase"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unknown format' }, { status: 400 });
}
