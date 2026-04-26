// Pure overlap detection for season date ranges.
// Range comparison is inclusive on both ends:
// [A_from, A_till] and [B_from, B_till] overlap iff
// A_from <= B_till AND B_from <= A_till.

export type DateRange = { valid_from: string; valid_till: string };

export type RangeConflict = {
  index: number;
  conflictsWith: number[];
  message: string;
};

function isValid(r: DateRange): boolean {
  return Boolean(r.valid_from) && Boolean(r.valid_till);
}

function overlaps(a: DateRange, b: DateRange): boolean {
  return a.valid_from <= b.valid_till && b.valid_from <= a.valid_till;
}

/**
 * Returns one entry per overlapping range, listing its peers and a stock message.
 * Ranges with empty/missing dates are skipped silently.
 */
export function detectRangeOverlaps(ranges: DateRange[]): RangeConflict[] {
  const conflicts: RangeConflict[] = [];
  for (let i = 0; i < ranges.length; i++) {
    if (!isValid(ranges[i])) continue;
    const peers: number[] = [];
    for (let j = 0; j < ranges.length; j++) {
      if (i === j) continue;
      if (!isValid(ranges[j])) continue;
      if (overlaps(ranges[i], ranges[j])) peers.push(j);
    }
    if (peers.length > 0) {
      conflicts.push({
        index: i,
        conflictsWith: peers,
        message: "Overlaps with another range in this season",
      });
    }
  }
  return conflicts;
}

export type SeasonRanges = {
  seasonLocalId: string;
  seasonName: string;
  ranges: DateRange[];
};

export type InterSeasonConflict = {
  seasonLocalId: string;
  rangeIndex: number;
  conflictsWithSeasonName: string;
  message: string;
};

/**
 * For each season, flag ranges that overlap with any range from a *different*
 * season in the same package.
 */
export function detectInterSeasonOverlaps(
  seasons: SeasonRanges[],
): InterSeasonConflict[] {
  const conflicts: InterSeasonConflict[] = [];
  for (let i = 0; i < seasons.length; i++) {
    const a = seasons[i];
    for (let ai = 0; ai < a.ranges.length; ai++) {
      const ar = a.ranges[ai];
      if (!isValid(ar)) continue;
      for (let j = 0; j < seasons.length; j++) {
        if (i === j) continue;
        const b = seasons[j];
        for (const br of b.ranges) {
          if (!isValid(br)) continue;
          if (overlaps(ar, br)) {
            const otherName = b.seasonName.trim() || "another season";
            conflicts.push({
              seasonLocalId: a.seasonLocalId,
              rangeIndex: ai,
              conflictsWithSeasonName: otherName,
              message: `Overlaps with season "${otherName}" in this package`,
            });
            break;
          }
        }
      }
    }
  }
  return conflicts;
}
