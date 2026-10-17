// Tri alphabétique français, insensible à la casse et aux accents.
export const byAlpha = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });
