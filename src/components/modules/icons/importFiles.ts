export interface ImportItem { file: File; folder?: string }

// Parcourt récursivement un dossier déposé ; le dossier racine est ignoré, les sous-dossiers donnent la catégorie.
export async function readDirectory(dir: FileSystemDirectoryEntry, path: string[]): Promise<ImportItem[]> {
  const reader = dir.createReader();
  const entries: FileSystemEntry[] = [];
  // readEntries renvoie les résultats par paquets : on boucle jusqu'à épuisement.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) break;
    entries.push(...batch);
  }
  const out: ImportItem[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory) {
      out.push(...await readDirectory(entry as FileSystemDirectoryEntry, [...path, entry.name]));
    } else {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      out.push({ file, folder: path.length ? path.join(' / ') : undefined });
    }
  }
  return out;
}

// Archive .zip (par exemple un export de Brandy) : les dossiers deviennent des catégories.
export async function readZip(zipFile: File): Promise<ImportItem[]> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(zipFile);
  const out: ImportItem[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || entry.name.startsWith('__MACOSX/')) continue;
    const parts = entry.name.split('/');
    const name = parts[parts.length - 1];
    if (name.startsWith('.') || !/\.svg$/i.test(name)) continue;
    const blob = await entry.async('blob');
    const dirs = parts.slice(0, -1);
    out.push({ file: new File([blob], name, { type: 'image/svg+xml' }), folder: dirs.length ? dirs.join(' / ') : undefined });
  }
  return out;
}
