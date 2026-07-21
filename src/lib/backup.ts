import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const SIGNATURE_FILE = path.join(BACKUPS_DIR, '.last-signature');
const DATA_FILES = ['brands.json', 'sections.json', 'assets.json', 'modules.json'];
const MAX_BACKUPS = 5;

export interface BackupInfo {
  id: string;
  createdAt: string;
}

function currentSignature(): string {
  const parts: string[] = [];
  for (const file of DATA_FILES) {
    const p = path.join(DATA_DIR, file);
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      parts.push(`${file}:${stat.size}:${stat.mtimeMs}`);
    }
  }
  return parts.join('|');
}

function timestampId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function idToIso(id: string): string {
  // id format: YYYY-MM-DDTHH-MM-SS-mmmZ
  const match = id.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!match) return new Date(0).toISOString();
  const [, date, h, m, s, ms] = match;
  return `${date}T${h}:${m}:${s}.${ms}Z`;
}

export function listBackups(): BackupInfo[] {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs.readdirSync(BACKUPS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({ id: d.name, createdAt: idToIso(d.name) }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function createBackup(force = false): Promise<BackupInfo | null> {
  if (!fs.existsSync(DATA_DIR)) return null;
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const signature = currentSignature();
  if (!force && fs.existsSync(SIGNATURE_FILE)) {
    const last = fs.readFileSync(SIGNATURE_FILE, 'utf-8');
    if (last === signature) return null;
  }

  const id = timestampId(new Date());
  const dest = path.join(BACKUPS_DIR, id);
  fs.mkdirSync(dest, { recursive: true });

  for (const file of DATA_FILES) {
    const src = path.join(DATA_DIR, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, file));
  }
  if (fs.existsSync(UPLOADS_DIR)) {
    await fs.promises.cp(UPLOADS_DIR, path.join(dest, 'uploads'), { recursive: true });
  }

  fs.writeFileSync(SIGNATURE_FILE, signature);

  const all = listBackups();
  for (const old of all.slice(MAX_BACKUPS)) {
    fs.rmSync(path.join(BACKUPS_DIR, old.id), { recursive: true, force: true });
  }

  return { id, createdAt: new Date().toISOString() };
}

export async function restoreBackup(id: string): Promise<boolean> {
  const src = path.join(BACKUPS_DIR, id);
  if (!fs.existsSync(src)) return false;

  for (const file of DATA_FILES) {
    const backupFile = path.join(src, file);
    if (fs.existsSync(backupFile)) fs.copyFileSync(backupFile, path.join(DATA_DIR, file));
  }
  const backupUploads = path.join(src, 'uploads');
  if (fs.existsSync(backupUploads)) {
    if (fs.existsSync(UPLOADS_DIR)) fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
    await fs.promises.cp(backupUploads, UPLOADS_DIR, { recursive: true });
  }

  // Force the next scheduled tick to snapshot the restored state
  if (fs.existsSync(SIGNATURE_FILE)) fs.rmSync(SIGNATURE_FILE);

  return true;
}
