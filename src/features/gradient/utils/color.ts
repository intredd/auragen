/** Parse a `#rgb` or `#rrggbb` hex string into 0–255 channels. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/** Parse a hex color into normalized 0–1 RGB channels (for shader uniforms). */
export function hexToNormalizedRgb(hex: string): [number, number, number] {
  const { r, g, b } = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
}

/** Relative luminance (0–1), WCAG-style. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Pick a readable foreground (near-black or white) for a given background
 * color, so overlaid UI stays visible without relying on blend modes.
 */
export function contrastColor(hex: string, dark = '#0b0b12', light = '#ffffff'): string {
  return luminance(hex) > 0.38 ? dark : light;
}
