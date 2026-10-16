import type { IconCategory } from '@/types';

// Nom de dossier valide dans un zip pour chaque catégorie (caractères interdits remplacés,
// doublons suffixés).
export function categoryFolders(categories: IconCategory[]): Map<string, string> {
  const folders = new Map<string, string>();
  const used = new Set<string>();
  for (const c of categories) {
    // « A / B » (catégorie issue d'un sous-dossier importé) redevient un vrai sous-dossier A/B.
    const base = c.name.split('/')
      .map(part => part.replace(/[\\:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().replace(/^\.+/, ''))
      .filter(Boolean)
      .join('/') || 'Catégorie';
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n})`;
    used.add(name.toLowerCase());
    folders.set(c.id, name);
  }
  return folders;
}

// Chemin d'une icône dans le zip : « Catégorie/nom.ext », ou « nom.ext » à la racine si sans catégorie.
export function iconZipPath(item: { categoryId?: string }, folders: Map<string, string>, filename: string): string {
  const folder = item.categoryId ? folders.get(item.categoryId) : undefined;
  return folder ? `${folder}/${filename}` : filename;
}
