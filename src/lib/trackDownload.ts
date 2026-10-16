// Signale un téléchargement effectué côté navigateur (fichier direct, PNG/WebP générés sur place…).
// Les zips et PDF générés par le serveur sont comptés côté serveur.
export function trackDownload(moduleId: string, itemIds: string[], bulk = false): void {
  if (itemIds.length === 0) return;
  try {
    const body = JSON.stringify({ moduleId, itemIds, bulk });
    if (navigator.sendBeacon?.('/api/stats/track', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/stats/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
  } catch {
    // le suivi ne doit jamais gêner un téléchargement
  }
}
