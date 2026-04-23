/**
 * Date Utilities for Season Parsing and Date Calculations
 *
 * Handles the "DD MMM YY - DD MMM YY" format used in hotel/tour seasons
 * Example: "01 Nov 25 - 21 Nov 25, 14 Feb 26 - 06 Mar 26"
 */

export const MONTH_MAP: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Parse a date string in format "DD MMM YY"
 * @example parseDate("01 Nov 25") → Date(2025, 10, 1)
 */
export function parseDate(dateStr: string): Date {
  const [day, monthStr, yearShort] = dateStr.trim().split(" ");

  if (!day || !monthStr || !yearShort) {
    throw new Error(`Invalid date format: "${dateStr}". Expected "DD MMM YY"`);
  }

  const month = MONTH_MAP[monthStr];
  if (month === undefined) {
    throw new Error(
      `Invalid month: "${monthStr}". Expected Jan, Feb, Mar, etc.`
    );
  }

  const year = 2000 + parseInt(yearShort, 10);
  const dayNum = parseInt(day, 10);

  return new Date(year, month, dayNum);
}

/**
 * Parse season date ranges
 * @example parseDateRanges("01 Nov 25 - 21 Nov 25, 14 Feb 26 - 06 Mar 26")
 */
export function parseDateRanges(dates: string): DateRange[] {
  // Special case: "All Season"
  if (dates === "All Season" || dates.toLowerCase() === "all season") {
    return [
      {
        start: new Date(2000, 0, 1),
        end: new Date(2099, 11, 31),
      },
    ];
  }

  // Split by comma for multiple ranges
  const rangeStrings = dates.split(",").map((s) => s.trim());

  return rangeStrings.map((range) => {
    const parts = range.split("-").map((s) => s.trim());

    if (parts.length !== 2) {
      throw new Error(
        `Invalid date range format: "${range}". Expected "DD MMM YY - DD MMM YY"`
      );
    }

    return {
      start: parseDate(parts[0]),
      end: parseDate(parts[1]),
    };
  });
}

/**
 * Check if two date ranges overlap
 */
export function datesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Calculate number of nights between two dates
 */
export function calculateNights(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate how many nights of a booking fall within season date ranges
 * Handles bookings that span multiple seasons
 */
export function calculateNightsInSeason(
  seasonRanges: DateRange[],
  checkIn: Date,
  checkOut: Date
): number {
  let totalNights = 0;

  for (const range of seasonRanges) {
    // Find the overlap between booking and season
    const overlapStart = new Date(
      Math.max(checkIn.getTime(), range.start.getTime())
    );
    const overlapEnd = new Date(
      Math.min(checkOut.getTime(), range.end.getTime())
    );

    // Only count if there's actual overlap
    if (overlapStart < overlapEnd) {
      const nights = calculateNights(overlapStart, overlapEnd);
      totalNights += nights;
    }
  }

  return totalNights;
}

/**
 * Format a date for display
 * @example formatDate(new Date(2025, 10, 1)) → "01 Nov 25"
 */
export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const monthName = Object.keys(MONTH_MAP).find(
    (key) => MONTH_MAP[key] === date.getMonth()
  );
  const year = date.getFullYear().toString().slice(-2);

  return `${day} ${monthName} ${year}`;
}

/**
 * Check if a specific date falls within a season's date ranges
 */
export function isDateInSeason(date: Date, seasonDates: string): boolean {
  const ranges = parseDateRanges(seasonDates);
  return ranges.some((range) => date >= range.start && date <= range.end);
}
