// Tri alphabétique français, insensible à la casse et aux accents.
export const byAlpha = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

// Normalise pour la recherche : minuscules, sans accents (« re » trouve « ré », « Écran »…).
export const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// « Commence par » : chaque mot saisi doit être le début d'un mot du texte (« re » trouve « aller retour », pas « centre »).
export function wordStartMatch(text: string, query: string) {
  const words = norm(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const tokens = norm(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.length > 0 && tokens.every(t => words.some(w => w.startsWith(t)));
}
