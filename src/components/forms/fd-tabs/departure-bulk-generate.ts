import {
  eachDayOfInterval,
  getDate,
  getDay,
  parseISO,
} from "date-fns";

export type BulkFrequency = "daily" | "weekly" | "monthly" | "every_weekday" | "custom";

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Generate the list of departure dates implied by a bulk-create config.
 * Returns ISO date strings (YYYY-MM-DD), sorted ascending. Empty array on
 * invalid input (missing dates, end < start, custom with no weekdays).
 *
 * Frequency rules:
 *   - daily:         every calendar day from..to inclusive
 *   - weekly:        every 7 days starting at `from`
 *   - monthly:       same day-of-month each month, skipping months that don't
 *                    have that day (e.g. monthly on 31st skips Feb, Apr, Jun,
 *                    Sep, Nov)
 *   - every_weekday: every Mon–Fri in range
 *   - custom:        every day in range whose weekday is in `weekdays`
 *                    (0=Sun..6=Sat)
 */
export function generateDates(
  fromIso: string,
  toIso: string,
  frequency: BulkFrequency,
  weekdays: number[],
): string[] {
  if (!fromIso || !toIso) return [];
  let from: Date, to: Date;
  try {
    from = parseISO(fromIso);
    to = parseISO(toIso);
  } catch {
    return [];
  }
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  if (to < from) return [];

  if (frequency === "daily") {
    return eachDayOfInterval({ start: from, end: to }).map(isoDate);
  }

  if (frequency === "weekly") {
    const out: string[] = [];
    let cursor = from;
    while (cursor <= to) {
      out.push(isoDate(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    }
    return out;
  }

  if (frequency === "monthly") {
    const targetDay = getDate(from);
    const fromYear = from.getFullYear();
    const fromMonth = from.getMonth();
    const out: string[] = [];
    // Walk one month at a time. JS Date wraps overflow days (Feb 31 → Mar 3),
    // so we detect the wrap by checking that getDate matches the target.
    for (let i = 0; i < 12 * 100; i++) {
      const candidate = new Date(fromYear, fromMonth + i, targetDay);
      if (candidate > to) break;
      if (candidate.getDate() !== targetDay) continue;
      if (candidate < from) continue;
      out.push(isoDate(candidate));
    }
    return out;
  }

  if (frequency === "every_weekday") {
    return eachDayOfInterval({ start: from, end: to })
      .filter((d) => {
        const day = getDay(d);
        return day >= 1 && day <= 5;
      })
      .map(isoDate);
  }

  // custom
  if (weekdays.length === 0) return [];
  return eachDayOfInterval({ start: from, end: to })
    .filter((d) => weekdays.includes(getDay(d)))
    .map(isoDate);
}
