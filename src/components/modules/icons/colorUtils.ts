// Accepte "e52323", "#E52323", "#f00" ; renvoie "#rrggbb"/"#rgb" ou null si invalide.
export function normalizeHex(input: string): string | null {
  const v = input.trim().replace(/^#/, '');
  return /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? `#${v.toLowerCase()}` : null;
}

// <input type="color"> n'accepte que #rrggbb.
export function toPickerValue(hex: string | null): string {
  if (!hex) return '#000000';
  return hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
}

export function sameColor(a: string | null, b: string): boolean {
  return !!a && a.toLowerCase() === b.toLowerCase();
}
