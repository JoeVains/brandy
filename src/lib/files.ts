import { getStore } from '@netlify/blobs';

const STORE_NAME = 'brandy-files';

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export async function saveFile(filename: string, data: ArrayBuffer, contentType: string): Promise<void> {
  const s = store();
  await s.set(filename, data, { metadata: { contentType } });
}

export async function getFile(filename: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const s = store();
  const result = await s.getWithMetadata(filename, { type: 'arrayBuffer' }).catch(() => null);
  if (!result) return null;
  const contentType = (result.metadata?.contentType as string) ?? 'application/octet-stream';
  return { data: result.data, contentType };
}

export async function deleteFile(filename: string): Promise<void> {
  const s = store();
  await s.delete(filename).catch(() => {});
}

// Toutes les clés du stockage de fichiers (utilisé par le nettoyage des fichiers inutilisés).
export async function listFileKeys(): Promise<string[]> {
  const s = store();
  const { blobs } = await s.list();
  return blobs.map(b => b.key);
}

export async function fileSize(filename: string): Promise<number> {
  const result = await store().get(filename, { type: 'arrayBuffer' }).catch(() => null);
  return result ? result.byteLength : 0;
}
