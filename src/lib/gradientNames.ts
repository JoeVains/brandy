import type { GradientStop } from '@/types';

function hexToHsl(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

type Family = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink' | 'neutral';

function family(hex: string): Family {
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.12 || l > 0.92 || l < 0.08) return 'neutral';
  if (h < 15 || h >= 345) return 'red';
  if (h < 40) return 'orange';
  if (h < 65) return 'yellow';
  if (h < 155) return 'green';
  if (h < 195) return 'cyan';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  if (h < 345) return 'pink';
  return 'neutral';
}

// Pick deterministically from an array using a simple hash of two hex values
function pick<T>(arr: T[], hex1: string, hex2: string): T {
  let n = 0;
  for (const c of hex1 + hex2) n = (n * 31 + c.charCodeAt(0)) & 0xffff;
  return arr[n % arr.length];
}

const NAMES: Record<string, string[]> = {
  'red-red':       ['Crimson Blaze', 'Ruby Rush', 'Red Flame', 'Scarlet Heat', 'Rose Fire'],
  'red-orange':    ['Ember', 'Lava Flow', 'Wildfire', 'Blazing Trail', 'Phoenix'],
  'red-yellow':    ['Sunrise', 'Flame', 'Solar Flare', 'Firebird', 'Golden Ember'],
  'red-pink':      ['Berry Crush', 'Raspberry', 'Coral Dusk', 'Rosy Glow', 'Pink Flame'],
  'orange-orange': ['Citrus', 'Amber Glow', 'Tangerine Dream', 'Harvest', 'Marmalade'],
  'orange-yellow': ['Golden Hour', 'Sunburst', 'Honey', 'Peach Fuzz', 'Daybreak'],
  'orange-red':    ['Sunset', 'Desert Heat', 'Ember Glow', 'Wildfire', 'Dusk'],
  'orange-pink':   ['Peachy Keen', 'Coral Reef', 'Soft Flame', 'Blossom', 'Sherbet'],
  'yellow-yellow': ['Lemon Zest', 'Sunlight', 'Gold Rush', 'Butter', 'Solar'],
  'yellow-green':  ['Lime Light', 'Spring Burst', 'Fresh Meadow', 'Chartreuse Dream', 'Kiwi'],
  'yellow-orange': ['Afternoon', 'Nectar', 'Warm Glow', 'Caramel', 'Honey Drip'],
  'green-green':   ['Forest', 'Emerald Isle', 'Sage', 'Deep Jungle', 'Verdant'],
  'green-cyan':    ['Lagoon', 'Sea Glass', 'Aqua Forest', 'Tropical', 'Minty Fresh'],
  'green-blue':    ['Ocean Breeze', 'Teal Dream', 'Deep Water', 'Pacific', 'Seafoam'],
  'green-yellow':  ['Spring', 'Fresh Lime', 'Meadow', 'Viridian', 'Botanical'],
  'cyan-cyan':     ['Ice Water', 'Arctic', 'Crystal Clear', 'Aqua', 'Glacial'],
  'cyan-blue':     ['Deep Ocean', 'Cerulean', 'Blue Lagoon', 'Azul', 'Horizon'],
  'cyan-green':    ['Tropical Waters', 'Reef', 'Mermaid', 'Seascape', 'Aquamarine'],
  'blue-blue':     ['Midnight', 'Ocean Depth', 'Royal', 'Sapphire', 'Navy'],
  'blue-purple':   ['Twilight', 'Aurora Borealis', 'Galaxy', 'Nebula', 'Cosmic'],
  'blue-cyan':     ['Glacier', 'Ice Age', 'Deep Sea', 'Electric Blue', 'Cool Breeze'],
  'blue-pink':     ['Candy', 'Cotton Candy', 'Dreamy', 'Bubblegum', 'Pastel Sky'],
  'purple-purple': ['Amethyst', 'Ultraviolet', 'Violet Haze', 'Deep Purple', 'Majestic'],
  'purple-pink':   ['Orchid', 'Berry Smoothie', 'Mystic', 'Lavender Rose', 'Blossom'],
  'purple-blue':   ['Night Sky', 'Deep Space', 'Stellar', 'Indigo', 'Cosmos'],
  'purple-red':    ['Wine', 'Velvet', 'Merlot', 'Plum', 'Bordeaux'],
  'pink-pink':     ['Rose Garden', 'Blush', 'Flamingo', 'Sakura', 'Petal'],
  'pink-purple':   ['Candy Floss', 'Fairy Tale', 'Pastel Dream', 'Unicorn', 'Magic Hour'],
  'pink-orange':   ['Peach Sunset', 'Warm Blush', 'Sorbet', 'Melon', 'Rose Gold'],
  'neutral-neutral': ['Charcoal', 'Slate', 'Silver Mist', 'Fog', 'Monochrome'],
};

function lookupKey(f1: Family, f2: Family): string {
  return NAMES[`${f1}-${f2}`] ? `${f1}-${f2}` : NAMES[`${f2}-${f1}`] ? `${f2}-${f1}` : 'neutral-neutral';
}

export function suggestGradientName(stops: GradientStop[]): string {
  if (stops.length === 0) return 'Gradient';
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const first = sorted[0].color;
  const last = sorted[sorted.length - 1].color;
  const f1 = family(first);
  const f2 = family(last);
  const key = lookupKey(f1, f2);
  return pick(NAMES[key] ?? ['Gradient'], first, last);
}
