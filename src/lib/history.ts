import { getStore } from '@netlify/blobs';
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

const STORE_NAME = 'brandy';
const KEY = 'history';
const MAX = 200;

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

async function read(): Promise<HistoryEntry[]> {
  const s = store();
  const data = await s.get(KEY, { type: 'json' }).catch(() => null);
  return (data as HistoryEntry[]) ?? [];
}

export async function logHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  const entries = await read();
  entries.unshift({ id: randomUUID(), timestamp: new Date().toISOString(), ...entry });
  await store().setJSON(KEY, entries.slice(0, MAX));
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return read();
}
