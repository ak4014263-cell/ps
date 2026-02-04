/**
 * CMYK Color Utilities
 * Provides functions for working with CMYK color space in design applications
 * Useful for print-ready design and professional color control
 */

/**
 * Convert RGB Hex to CMYK percentages
 * @param hexColor - Color in hex format (e.g., #FF0000)
 * @returns Object with c, m, y, k values (0-100)
 */
export function rgbToCMYK(hexColor: string): {
  c: number;
  m: number;
  y: number;
  k: number;
} {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const k = 1 - Math.max(r, g, b);
  const c = (1 - r - k) / (1 - k) || 0;
  const m = (1 - g - k) / (1 - k) || 0;
  const y = (1 - b - k) / (1 - k) || 0;

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

/**
 * Convert CMYK percentages to RGB Hex
 * @param c - Cyan percentage (0-100)
 * @param m - Magenta percentage (0-100)
 * @param y - Yellow percentage (0-100)
 * @param k - Black/Key percentage (0-100)
 * @returns Color in hex format (e.g., #FF0000)
 */
export function cmykToRGB(c: number, m: number, y: number, k: number): string {
  const r = Math.round(255 * (1 - c / 100) * (1 - k / 100));
  const g = Math.round(255 * (1 - m / 100) * (1 - k / 100));
  const b = Math.round(255 * (1 - y / 100) * (1 - k / 100));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Get CMYK color name/description
 * @param c - Cyan percentage
 * @param m - Magenta percentage
 * @param y - Yellow percentage
 * @param k - Black percentage
 * @returns Human-readable color name
 */
export function getCMYKColorName(
  c: number,
  m: number,
  y: number,
  k: number
): string {
  // Pure CMYK colors
  if (c === 100 && m === 0 && y === 0 && k === 0) return 'Cyan';
  if (c === 0 && m === 100 && y === 0 && k === 0) return 'Magenta';
  if (c === 0 && m === 0 && y === 100 && k === 0) return 'Yellow';
  if (c === 0 && m === 0 && y === 0 && k === 100) return 'Black';
  if (c === 0 && m === 0 && y === 0 && k === 0) return 'White';

  // Common mixtures
  if (c > 0 && m > 0 && y === 0 && k === 0) return 'Blue';
  if (c > 0 && m === 0 && y > 0 && k === 0) return 'Green';
  if (c === 0 && m > 0 && y > 0 && k === 0) return 'Red';

  // Generic description
  const parts: string[] = [];
  if (c > 50) parts.push('Cyan');
  if (m > 50) parts.push('Magenta');
  if (y > 50) parts.push('Yellow');
  if (k > 50) parts.push('Black');

  return parts.length > 0 ? parts.join(' + ') : 'Custom Color';
}

/**
 * Format CMYK values for display
 * @param c - Cyan
 * @param m - Magenta
 * @param y - Yellow
 * @param k - Black
 * @returns Formatted string (e.g., "C:100 M:0 Y:0 K:0")
 */
export function formatCMYK(c: number, m: number, y: number, k: number): string {
  return `C:${c} M:${m} Y:${y} K:${k}`;
}

/**
 * Parse CMYK string to object
 * @param cmykString - String like "C:100 M:0 Y:0 K:0"
 * @returns CMYK object
 */
export function parseCMYK(cmykString: string): { c: number; m: number; y: number; k: number } | null {
  const match = cmykString.match(/C:(\d+)\s*M:(\d+)\s*Y:(\d+)\s*K:(\d+)/i);
  if (!match) return null;

  return {
    c: parseInt(match[1]),
    m: parseInt(match[2]),
    y: parseInt(match[3]),
    k: parseInt(match[4]),
  };
}

/**
 * Adjust CMYK values to ensure valid print colors
 * Clamps values to 0-100 range
 * @param c - Cyan
 * @param m - Magenta
 * @param y - Yellow
 * @param k - Black
 * @returns Adjusted CMYK values
 */
export function normalizeCMYK(
  c: number,
  m: number,
  y: number,
  k: number
): { c: number; m: number; y: number; k: number } {
  return {
    c: Math.max(0, Math.min(100, Math.round(c))),
    m: Math.max(0, Math.min(100, Math.round(m))),
    y: Math.max(0, Math.min(100, Math.round(y))),
    k: Math.max(0, Math.min(100, Math.round(k))),
  };
}

/**
 * Check if a color is a "print-safe" CMYK color
 * (Uses standard process colors without heavy overprinting)
 * @param c - Cyan
 * @param m - Magenta
 * @param y - Yellow
 * @param k - Black
 * @returns true if color is print-safe
 */
export function isPrintSafe(c: number, m: number, y: number, k: number): boolean {
  // Total ink coverage should not exceed 240% for standard offset printing
  const totalInk = c + m + y + k;
  return totalInk <= 240;
}

/**
 * Get recommended ink coverage for CMYK color
 * Useful for adjusting colors for different printing methods
 * @param c - Cyan
 * @param m - Magenta
 * @param y - Yellow
 * @param k - Black
 * @returns Ink coverage percentage
 */
export function getInkCoverage(c: number, m: number, y: number, k: number): number {
  return c + m + y + k;
}

/**
 * Predefined CMYK color library
 */
export const CMYK_COLOR_LIBRARY = {
  // Pure Colors
  Cyan: { c: 100, m: 0, y: 0, k: 0 },
  Magenta: { c: 0, m: 100, y: 0, k: 0 },
  Yellow: { c: 0, m: 0, y: 100, k: 0 },
  Black: { c: 0, m: 0, y: 0, k: 100 },
  White: { c: 0, m: 0, y: 0, k: 0 },

  // Common Colors
  Red: { c: 0, m: 100, y: 100, k: 0 },
  Green: { c: 100, m: 0, y: 100, k: 0 },
  Blue: { c: 100, m: 100, y: 0, k: 0 },
  Orange: { c: 0, m: 50, y: 100, k: 0 },
  Purple: { c: 50, m: 100, y: 0, k: 0 },
  Brown: { c: 0, m: 50, y: 100, k: 50 },
  Gray: { c: 0, m: 0, y: 0, k: 50 },

  // Light Colors
  'Light Cyan': { c: 50, m: 0, y: 0, k: 0 },
  'Light Magenta': { c: 0, m: 50, y: 0, k: 0 },
  'Light Yellow': { c: 0, m: 0, y: 50, k: 0 },
  'Light Gray': { c: 0, m: 0, y: 0, k: 25 },

  // Dark Colors
  'Dark Cyan': { c: 100, m: 50, y: 50, k: 0 },
  'Dark Red': { c: 0, m: 100, y: 100, k: 50 },
  'Dark Green': { c: 100, m: 0, y: 100, k: 50 },
  'Dark Blue': { c: 100, m: 100, y: 0, k: 50 },
};

/**
 * Convert color hex to CMYK and back to verify conversion accuracy
 * Useful for quality control in print workflows
 * @param hexColor - Original hex color
 * @returns Verification object with RGB, CMYK, and hex representation
 */
export function verifyCMYKConversion(hexColor: string): {
  original: string;
  cmyk: { c: number; m: number; y: number; k: number };
  converted: string;
  accurate: boolean;
} {
  const cmyk = rgbToCMYK(hexColor);
  const converted = cmykToRGB(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
  const original = hexColor.toUpperCase().startsWith('#') ? hexColor.toUpperCase() : `#${hexColor}`;

  // Allow for small rounding errors (±1 due to 8-bit to percentage conversions)
  const accurate = original === converted;

  return {
    original,
    cmyk,
    converted,
    accurate,
  };
}
