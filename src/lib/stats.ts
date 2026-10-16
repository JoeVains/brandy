import { getStore } from '@netlify/blobs';

// Statistiques de téléchargement : un enregistrement par module, une entrée par élément téléchargé
// (clé « __single » pour l'image unique d'un module).
export interface ItemStat {
  total: number;                   // téléchargements ciblés (fichier seul, catégorie, sélection)
  bulk?: number;                   // inclus dans un « Tout télécharger » sans sélection
  bulkDays?: Record<string, number>;
  last: string;                    // date ISO du dernier téléchargement
  days: Record<string, number>;    // AAAA-MM-JJ → nombre de téléchargements
}
export type ModuleStats = Record<string, ItemStat>;

const KEEP_DAYS = 120;

const store = () => getStore({ name: 'brandy', consistency: 'strong' });
const key = (moduleId: string) => `stats-${moduleId}`;

export async function readStats(moduleId: string): Promise<ModuleStats> {
  const data = await store().get(key(moduleId), { type: 'json' }).catch(() => null);
  return (data as ModuleStats) ?? {};
}

// Ajoute un téléchargement par élément. Ne bloque jamais l'action de l'utilisateur : les erreurs sont avalées.
// `bulk` : zip complet sans sélection, compté à part pour ne pas fausser le classement des fichiers réellement choisis.
export async function recordDownloads(moduleId: string, itemIds: string[], bulk = false): Promise<void> {
  if (itemIds.length === 0) return;
  try {
    const stats = await readStats(moduleId);
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const cutoff = new Date(now.getTime() - KEEP_DAYS * 86400_000).toISOString().slice(0, 10);
    for (const id of new Set(itemIds)) {
      const s = stats[id] ?? { total: 0, last: '', days: {} };
      s.last = now.toISOString();
      if (bulk) {
        s.bulk = (s.bulk ?? 0) + 1;
        s.bulkDays = s.bulkDays ?? {};
        s.bulkDays[day] = (s.bulkDays[day] ?? 0) + 1;
        for (const d of Object.keys(s.bulkDays)) if (d < cutoff) delete s.bulkDays[d];
      } else {
        s.total += 1;
        s.days[day] = (s.days[day] ?? 0) + 1;
        for (const d of Object.keys(s.days)) if (d < cutoff) delete s.days[d];
      }
      stats[id] = s;
    }
    await store().setJSON(key(moduleId), stats);
  } catch (e) {
    console.error('Stats error:', (e as Error).message);
  }
}

export function countSince(stat: ItemStat | undefined, days: number, bulk = false): number {
  const source = bulk ? stat?.bulkDays : stat?.days;
  if (!source) return 0;
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  return Object.entries(source).reduce((n, [d, c]) => (d >= cutoff ? n + c : n), 0);
}

export async function deleteStats(moduleId: string): Promise<void> {
  await store().delete(key(moduleId)).catch(() => {});
}
