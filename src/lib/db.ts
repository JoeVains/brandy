import fs from 'fs';
import path from 'path';
import { Brand, Section, Asset } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export function ensureDirs() {
  [DATA_DIR, UPLOADS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function readJson<T>(file: string, fallback: T): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeJson(file: string, data: unknown) {
  ensureDirs();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

export const db = {
  brands: {
    all: () => readJson<Brand[]>('brands.json', []),
    save: (brands: Brand[]) => writeJson('brands.json', brands),
  },
  sections: {
    all: () => readJson<Section[]>('sections.json', []),
    save: (sections: Section[]) => writeJson('sections.json', sections),
  },
  assets: {
    all: () => readJson<Asset[]>('assets.json', []),
    save: (assets: Asset[]) => writeJson('assets.json', assets),
  },
};
