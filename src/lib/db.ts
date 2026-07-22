import { getStore } from '@netlify/blobs';
import { Brand, Section, Asset, Module } from '@/types';

const STORE_NAME = 'brandy';
const COLLECTIONS = ['brands', 'sections', 'assets', 'modules'] as const;
type Collection = (typeof COLLECTIONS)[number];

// Backup au plus une fois par heure, conservées 5 jours.
const BACKUP_INTERVAL_MS = 3600_000;
const BACKUP_RETENTION_MS = 5 * 86400_000;

function store() {
  return getStore(STORE_NAME);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const s = store();
  const data = await s.get(key, { type: 'json' }).catch(() => null);
  return (data as T) ?? fallback;
}

async function writeJson(key: string, data: unknown): Promise<void> {
  const s = store();
  await s.setJSON(key, data);
}

// Snapshotte l'état actuel de toutes les collections avant écriture, au plus
// une fois par heure. N'empêche jamais l'écriture principale — les erreurs
// de backup sont journalisées et avalées.
async function maybeBackup() {
  try {
    const s = store();
    const lastRaw = await s.get('backup-last', { type: 'text' }).catch(() => null);
    const last = lastRaw ? new Date(lastRaw).getTime() : 0;
    if (Date.now() - last < BACKUP_INTERVAL_MS) return;

    const snapshot: Record<Collection, unknown> = {} as Record<Collection, unknown>;
    for (const c of COLLECTIONS) {
      snapshot[c] = await readJson(c, []);
    }
    const stamp = new Date().toISOString();
    await s.setJSON(`backup-${stamp}`, snapshot);
    await s.set('backup-last', stamp);

    const cutoff = Date.now() - BACKUP_RETENTION_MS;
    const { blobs } = await s.list({ prefix: 'backup-' });
    for (const b of blobs) {
      const t = new Date(b.key.slice('backup-'.length)).getTime();
      if (!isNaN(t) && t < cutoff) await s.delete(b.key);
    }
  } catch (e) {
    console.error('Backup error:', (e as Error).message);
  }
}

async function save(key: Collection, data: unknown) {
  await maybeBackup();
  await writeJson(key, data);
}

export const db = {
  brands: {
    all: () => readJson<Brand[]>('brands', []),
    save: (brands: Brand[]) => save('brands', brands),
  },
  sections: {
    all: () => readJson<Section[]>('sections', []),
    save: (sections: Section[]) => save('sections', sections),
  },
  assets: {
    all: () => readJson<Asset[]>('assets', []),
    save: (assets: Asset[]) => save('assets', assets),
  },
  modules: {
    all: () => readJson<Module[]>('modules', []),
    save: (modules: Module[]) => save('modules', modules),
  },
};

export interface BackupInfo {
  id: string;
  createdAt: string;
}

export async function listBackups(): Promise<BackupInfo[]> {
  const s = store();
  const { blobs } = await s.list({ prefix: 'backup-' });
  return blobs
    .map(b => ({ id: b.key, createdAt: b.key.slice('backup-'.length) }))
    .filter(b => !isNaN(new Date(b.createdAt).getTime()))
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function createBackupNow(): Promise<BackupInfo> {
  const s = store();
  const snapshot: Record<Collection, unknown> = {} as Record<Collection, unknown>;
  for (const c of COLLECTIONS) {
    snapshot[c] = await readJson(c, []);
  }
  const stamp = new Date().toISOString();
  await s.setJSON(`backup-${stamp}`, snapshot);
  await s.set('backup-last', stamp);
  return { id: `backup-${stamp}`, createdAt: stamp };
}

export async function restoreBackup(id: string): Promise<boolean> {
  const s = store();
  const snapshot = (await s.get(id, { type: 'json' }).catch(() => null)) as Record<Collection, unknown> | null;
  if (!snapshot) return false;
  for (const c of COLLECTIONS) {
    if (c in snapshot) await writeJson(c, snapshot[c]);
  }
  // Force la prochaine écriture à re-snapshotter l'état restauré
  await s.delete('backup-last').catch(() => {});
  return true;
}
