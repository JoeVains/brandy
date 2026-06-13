import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type HistoryAction =
  | 'module.create' | 'module.edit' | 'module.delete'
  | 'section.create' | 'section.edit' | 'section.delete'
  | 'brand.create' | 'brand.edit' | 'brand.delete';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: HistoryAction;
  brandName?: string;
  sectionName?: string;
  entityName?: string;
  entityType?: string; // module type
}

const FILE = path.join(process.cwd(), 'data', 'history.json');
const MAX = 200;

function read(): HistoryEntry[] {
  if (!fs.existsSync(FILE)) return [];
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')); } catch { return []; }
}

export function logHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  const entries = read();
  entries.unshift({ id: randomUUID(), timestamp: new Date().toISOString(), ...entry });
  fs.writeFileSync(FILE, JSON.stringify(entries.slice(0, MAX), null, 2));
}

export function getHistory(): HistoryEntry[] {
  return read();
}
