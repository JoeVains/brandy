import type { AssetStatus, FileVersion } from '@/types';

interface Versioned {
  filename: string;
  size: number;
  mimeType?: string;
  status?: AssetStatus;
  versions?: FileVersion[];
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  draft: 'Brouillon',
  validated: 'Validé',
  obsolete: 'Obsolète',
};

// Sans statut = validé : les fichiers existants restent publiés.
export const statusOf = (item: { status?: AssetStatus }): AssetStatus => item.status ?? 'validated';

// Seuls les fichiers validés sont inclus dans les zips « tout télécharger » et dans l'export PDF.
export const isPublished = (item: { status?: AssetStatus }) => statusOf(item) === 'validated';

// En lecture : les brouillons sont masqués, les obsolètes seulement si le visiteur le demande.
export function visibleItems<T extends { status?: AssetStatus }>(items: T[], editing: boolean, showObsolete: boolean): T[] {
  if (editing) return items;
  return items.filter(i => {
    const s = statusOf(i);
    return s === 'validated' || (s === 'obsolete' && showObsolete);
  });
}

// Remet une ancienne version en service : la version actuelle rejoint l'historique.
export function restoreVersion<T extends Versioned>(item: T, index: number): T {
  const versions = item.versions ?? [];
  const target = versions[index];
  if (!target) return item;
  const current: FileVersion = { filename: item.filename, size: item.size, mimeType: item.mimeType, date: new Date().toISOString() };
  return {
    ...item,
    filename: target.filename,
    size: target.size,
    ...(target.mimeType ? { mimeType: target.mimeType } : {}),
    versions: [current, ...versions.filter((_, i) => i !== index)],
  };
}
