/**
 * Smart Query Color Generator
 *
 * Generates consistent, visually distinct colors for booking queries
 * - Same query ID always gets the same color (deterministic)
 * - Prevents neighboring queries from having similar colors
 * - Uses perceptually uniform color distribution
 */

export interface QueryColorConfig {
  bgColor: string; // Background color with opacity (works in both light/dark mode)
  borderColor: string; // Same hue, used for left border
  hue: number; // Store for neighbor-aware allocation
}

/**
 * Simple string hash function (DJB2 algorithm)
 * Converts query ID to a number for color generation
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generate a color palette with maximum perceptual distance
 * Uses HSL color space for even distribution
 */
const COLOR_PALETTE_SIZE = 24; // Large enough to minimize collisions
const SATURATION = 60; // Medium saturation for better readability
const LIGHTNESS_LIGHT = 88; // For light mode backgrounds (lighter but readable)
const LIGHTNESS_DARK = 20; // For dark mode backgrounds
const BORDER_LIGHTNESS = 45; // For borders

/**
 * Generates a deterministic color config for a query ID
 */
export function getQueryColor(queryId: string): QueryColorConfig {
  const hash = hashString(queryId);

  // Distribute hues evenly across the color wheel
  // Avoid red (0-30) and orange (30-50) as they're used for status
  const hueOffset = 50; // Start after orange
  const hueRange = 310; // 360 - 50 = 310 degrees available

  const hue = hueOffset + (hash % hueRange);

  // Use hsla with alpha for better dark mode support
  // Lower opacity allows the card background to show through, improving contrast
  return {
    bgColor: `hsla(${hue}, ${SATURATION}%, ${LIGHTNESS_LIGHT}%, 0.15)`,
    borderColor: `hsl(${hue}, ${SATURATION}%, ${BORDER_LIGHTNESS}%)`,
    hue,
  };
}

/**
 * Neighbor-aware color allocation
 * Given a list of query IDs and their row assignments, adjusts colors
 * to ensure adjacent rows don't have similar hues
 */
interface QueryRowInfo {
  queryId: string;
  row: number;
}

export function allocateNeighborAwareColors(queries: QueryRowInfo[]): Map<string, QueryColorConfig> {
  const colorMap = new Map<string, QueryColorConfig>();

  // Group queries by row
  const rowMap = new Map<number, string[]>();
  queries.forEach(({ queryId, row }) => {
    if (!rowMap.has(row)) {
      rowMap.set(row, []);
    }
    rowMap.get(row)!.push(queryId);
  });

  // Sort rows
  const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b);

  // Track used hues per row for neighbor checking
  const usedHuesPerRow = new Map<number, number[]>();

  sortedRows.forEach((row) => {
    const queryIds = rowMap.get(row)!;
    usedHuesPerRow.set(row, []);

    queryIds.forEach((queryId) => {
      let color = getQueryColor(queryId);
      let hue = color.hue;

      // Check neighbors (row above and below)
      const neighborRows = [row - 1, row + 1];
      const neighborHues = neighborRows.flatMap((r) => usedHuesPerRow.get(r) || []);

      // If this hue is too close to any neighbor, shift it
      let attempts = 0;
      while (attempts < 10 && isTooCloseToNeighbors(hue, neighborHues)) {
        // Shift by golden angle (~137.5°) for good distribution
        hue = (hue + 137.5) % 360;
        attempts++;
      }

      // Update color with adjusted hue if needed
      if (hue !== color.hue) {
        color = {
          bgColor: `hsla(${hue}, ${SATURATION}%, ${LIGHTNESS_LIGHT}%, 0.15)`,
          borderColor: `hsl(${hue}, ${SATURATION}%, ${BORDER_LIGHTNESS}%)`,
          hue,
        };
      }

      colorMap.set(queryId, color);
      usedHuesPerRow.get(row)!.push(hue);
    });
  });

  return colorMap;
}

/**
 * Check if a hue is too close to any neighbor hues
 * Minimum distance threshold: 30 degrees
 */
function isTooCloseToNeighbors(hue: number, neighborHues: number[]): boolean {
  const MIN_DISTANCE = 30;

  return neighborHues.some((neighborHue) => {
    const diff = Math.abs(hue - neighborHue);
    // Handle wraparound (e.g., 10° and 350° are close)
    const distance = Math.min(diff, 360 - diff);
    return distance < MIN_DISTANCE;
  });
}

/**
 * Simple deterministic color getter (no neighbor checking)
 * Use this when row information is not available
 */
export function getSimpleQueryColor(queryId: string): QueryColorConfig {
  return getQueryColor(queryId);
}
