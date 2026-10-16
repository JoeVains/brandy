import { allDataAsText } from './db';
import { deleteFile, fileSize, listFileKeys } from './files';

// Les fichiers sont nommés « uuid.ext » : on les retrouve dans n'importe quel champ (images, versions, HTML riche…).
const FILE_TOKEN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.[A-Za-z0-9]+)?/g;

export interface CleanupReport {
  dryRun: boolean;
  totalFiles: number;
  usedFiles: number;
  orphans: { key: string; size: number }[];
  freedBytes: number;
  deleted: number;
}

// Supprime les fichiers qui ne sont référencés ni par les données actuelles, ni par une sauvegarde conservée
// (une restauration de sauvegarde ne peut donc jamais retrouver un fichier manquant).
// Les clés sont listées AVANT de lire les données, pour ne jamais supprimer un fichier tout juste envoyé.
export async function cleanupFiles(dryRun: boolean): Promise<CleanupReport> {
  const keys = await listFileKeys();
  const referenced = new Set<string>();
  for (const text of await allDataAsText()) {
    for (const m of text.matchAll(FILE_TOKEN)) referenced.add(m[0]);
  }

  const orphanKeys = keys.filter(k => !referenced.has(k));
  const orphans: { key: string; size: number }[] = [];
  // Tailles lues par petits lots pour ne pas saturer le stockage.
  for (let i = 0; i < orphanKeys.length; i += 5) {
    const batch = orphanKeys.slice(i, i + 5);
    const sizes = await Promise.all(batch.map(fileSize));
    batch.forEach((key, j) => orphans.push({ key, size: sizes[j] }));
  }

  let deleted = 0;
  if (!dryRun) {
    for (const o of orphans) { await deleteFile(o.key); deleted++; }
  }

  return {
    dryRun,
    totalFiles: keys.length,
    usedFiles: keys.length - orphanKeys.length,
    orphans,
    freedBytes: orphans.reduce((n, o) => n + o.size, 0),
    deleted,
  };
}
