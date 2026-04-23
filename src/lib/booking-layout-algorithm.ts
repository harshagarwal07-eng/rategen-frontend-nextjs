/**
 * Smart Booking Calendar Row Assignment Algorithm
 *
 * Requirements:
 * 1. All cards from the same query stay in the same row across days
 * 2. Neighbor-aware color allocation (no same colors in adjacent rows/columns)
 * 3. Minimum 2-row gap when queries overlap on the same day
 * 4. Efficient row packing to minimize total rows
 *
 * Example:
 * ✓ CORRECT:
 *   d1        d2        d3
 *   q1c1      q1c2      q1c3
 *   q2c1                q2c2
 *
 * ✗ WRONG (query split across rows):
 *   d1        d2        d3
 *   q1c1      q2c1      q1c3
 *             q1c2
 */

import { format, isSameDay } from "date-fns";
import { allocateNeighborAwareColors, type QueryColorConfig } from "./query-color-generator";
import type { CalendarBooking } from "@/types/ops-bookings";

// =====================================================
// Types & Interfaces
// =====================================================

export interface QueryRowAssignment {
  queryId: string;
  shortQueryId: string;
  travelerName: string;
  row: number;
  bookings: CalendarBooking[];
  occupiedDays: Set<number>; // Day indices where this query has bookings (0-based column index)
  color: QueryColorConfig;
}

export interface DayColumn {
  dayIndex: number;
  date: Date;
  dateStr: string; // YYYY-MM-DD format
  queries: Map<string, CalendarBooking[]>; // queryId -> bookings for this day
}

export interface CalendarLayoutRow {
  rowIndex: number;
  queryAssignments: Map<string, QueryRowAssignment>; // queryId -> assignment
}

export interface CalendarLayoutResult {
  rows: CalendarLayoutRow[];
  queryColors: Map<string, QueryColorConfig>;
  maxRows: number;
  dayColumns: DayColumn[];
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get all dates occupied by a booking (YYYY-MM-DD format)
 */
function getBookingOccupiedDates(booking: CalendarBooking): string[] {
  const dates: string[] = [];

  if (booking.service_type === "hotel") {
    if (booking.check_in_date && booking.check_out_date) {
      // Add all dates from check-in to check-out (inclusive)
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);

      let currentDate = new Date(checkIn);
      while (currentDate <= checkOut) {
        dates.push(format(currentDate, "yyyy-MM-dd"));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  } else if (booking.service_type === "tour" && booking.tour_date) {
    // Tours occupy single day (unless duration is specified in future)
    dates.push(booking.tour_date);
  } else if (booking.service_type === "transfer") {
    if (booking.pickup_date) {
      dates.push(booking.pickup_date);
    }
    if (booking.drop_date && booking.drop_date !== booking.pickup_date) {
      dates.push(booking.drop_date);
    }
  }

  return dates;
}

/**
 * Group bookings by day
 */
function groupBookingsByDay(bookings: CalendarBooking[], calendarDays: Date[]): DayColumn[] {
  return calendarDays.map((day, dayIndex) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const queries = new Map<string, CalendarBooking[]>();

    bookings.forEach((booking) => {
      const occupiedDates = getBookingOccupiedDates(booking);
      const isOnThisDay = occupiedDates.includes(dateStr);

      if (isOnThisDay) {
        const queryId = booking.short_query_id;
        if (!queries.has(queryId)) {
          queries.set(queryId, []);
        }
        queries.get(queryId)!.push(booking);
      }
    });

    return { dayIndex, date: day, dateStr, queries };
  });
}

/**
 * Get all unique query IDs from bookings
 */
function getUniqueQueries(
  bookings: CalendarBooking[]
): Map<string, { shortQueryId: string; travelerName: string; bookings: CalendarBooking[] }> {
  const queries = new Map<string, { shortQueryId: string; travelerName: string; bookings: CalendarBooking[] }>();

  bookings.forEach((booking) => {
    const queryId = booking.short_query_id;
    if (!queries.has(queryId)) {
      queries.set(queryId, {
        shortQueryId: booking.short_query_id,
        travelerName: booking.traveler_name,
        bookings: [],
      });
    }
    queries.get(queryId)!.bookings.push(booking);
  });

  return queries;
}

// =====================================================
// Row Assignment Algorithm
// =====================================================

/**
 * Check if a query can fit in a row (no conflicts with existing queries on same days)
 */
function canQueryFitInRow(row: CalendarLayoutRow, queryOccupiedDays: Set<number>): boolean {
  // Check all existing queries in this row
  for (const assignment of row.queryAssignments.values()) {
    // Check if any occupied days overlap
    const hasOverlap = Array.from(queryOccupiedDays).some((day) => assignment.occupiedDays.has(day));

    if (hasOverlap) {
      return false;
    }
  }

  return true;
}

/**
 * Assign queries to rows using First Fit Decreasing (by number of occupied days)
 */
function assignQueriesToRows(
  queries: Map<string, { shortQueryId: string; travelerName: string; bookings: CalendarBooking[] }>,
  dayColumns: DayColumn[]
): CalendarLayoutRow[] {
  const rows: CalendarLayoutRow[] = [];

  // Calculate occupied days for each query
  const queryOccupancy = new Map<
    string,
    {
      queryId: string;
      shortQueryId: string;
      travelerName: string;
      bookings: CalendarBooking[];
      occupiedDays: Set<number>;
    }
  >();

  queries.forEach(({ shortQueryId, travelerName, bookings }, queryId) => {
    const occupiedDays = new Set<number>();

    dayColumns.forEach((dayColumn) => {
      if (dayColumn.queries.has(queryId)) {
        occupiedDays.add(dayColumn.dayIndex);
      }
    });

    queryOccupancy.set(queryId, {
      queryId,
      shortQueryId,
      travelerName,
      bookings,
      occupiedDays,
    });
  });

  // Sort queries by number of occupied days (descending) for better packing
  const sortedQueries = Array.from(queryOccupancy.values()).sort((a, b) => b.occupiedDays.size - a.occupiedDays.size);

  // Assign each query to a row
  sortedQueries.forEach((queryData) => {
    let placed = false;

    // Try to fit in existing rows
    for (const row of rows) {
      if (canQueryFitInRow(row, queryData.occupiedDays)) {
        // Assign to this row
        const assignment: QueryRowAssignment = {
          queryId: queryData.queryId,
          shortQueryId: queryData.shortQueryId,
          travelerName: queryData.travelerName,
          row: row.rowIndex,
          bookings: queryData.bookings,
          occupiedDays: queryData.occupiedDays,
          color: { bgColor: "", borderColor: "", hue: 0 }, // Will be assigned later
        };

        row.queryAssignments.set(queryData.queryId, assignment);
        placed = true;
        break;
      }
    }

    // If can't fit in any existing row, create new row
    if (!placed) {
      const newRow: CalendarLayoutRow = {
        rowIndex: rows.length,
        queryAssignments: new Map(),
      };

      const assignment: QueryRowAssignment = {
        queryId: queryData.queryId,
        shortQueryId: queryData.shortQueryId,
        travelerName: queryData.travelerName,
        row: newRow.rowIndex,
        bookings: queryData.bookings,
        occupiedDays: queryData.occupiedDays,
        color: { bgColor: "", borderColor: "", hue: 0 },
      };

      newRow.queryAssignments.set(queryData.queryId, assignment);
      rows.push(newRow);
    }
  });

  return rows;
}

// =====================================================
// Enhanced Neighbor-Aware Color Allocation
// =====================================================

/**
 * Allocate colors with both row and column neighbor awareness
 */
function allocateEnhancedColors(rows: CalendarLayoutRow[], dayColumns: DayColumn[]): Map<string, QueryColorConfig> {
  // Step 1: Basic row-based neighbor allocation
  const queryRowInfo = rows.flatMap((row) =>
    Array.from(row.queryAssignments.values()).map((assignment) => ({
      queryId: assignment.queryId,
      row: row.rowIndex,
    }))
  );

  const baseColors = allocateNeighborAwareColors(queryRowInfo);
  const colorMap = new Map<string, QueryColorConfig>();

  // Step 2: Refine based on same-day column neighbors
  rows.forEach((row) => {
    row.queryAssignments.forEach((assignment) => {
      let color = baseColors.get(assignment.queryId) || {
        bgColor: "hsl(200, 70%, 92%)",
        borderColor: "hsl(200, 70%, 45%)",
        hue: 200,
      };

      // Check all days this query occupies
      const columnNeighborHues: number[] = [];

      assignment.occupiedDays.forEach((dayIndex) => {
        const dayColumn = dayColumns[dayIndex];

        // Find other queries on same day in adjacent rows
        const adjacentRows = [row.rowIndex - 1, row.rowIndex + 1];

        adjacentRows.forEach((adjacentRowIndex) => {
          if (adjacentRowIndex >= 0 && adjacentRowIndex < rows.length) {
            const adjacentRow = rows[adjacentRowIndex];

            adjacentRow.queryAssignments.forEach((otherAssignment) => {
              if (otherAssignment.occupiedDays.has(dayIndex)) {
                // This is a column neighbor on same day
                const neighborColor = colorMap.get(otherAssignment.queryId);
                if (neighborColor) {
                  columnNeighborHues.push(neighborColor.hue);
                }
              }
            });
          }
        });
      });

      // Adjust hue if too close to column neighbors
      let hue = color.hue;
      let attempts = 0;

      while (
        attempts < 10 &&
        columnNeighborHues.some((neighborHue) => {
          const diff = Math.abs(hue - neighborHue);
          const distance = Math.min(diff, 360 - diff);
          return distance < 30; // Minimum 30-degree separation
        })
      ) {
        hue = (hue + 137.5) % 360; // Golden angle shift
        attempts++;
      }

      // Update color if hue changed
      if (hue !== color.hue) {
        color = {
          bgColor: `hsl(${hue}, 70%, 92%)`,
          borderColor: `hsl(${hue}, 70%, 45%)`,
          hue,
        };
      }

      colorMap.set(assignment.queryId, color);
      assignment.color = color;
    });
  });

  return colorMap;
}

// =====================================================
// Main Layout Function
// =====================================================

/**
 * Calculate smart calendar layout with query-row consistency and neighbor-aware colors
 *
 * @param bookings - All bookings to display
 * @param calendarDays - Array of dates shown in calendar (e.g., 7 days for week view)
 */
export function calculateCalendarLayout(bookings: CalendarBooking[], calendarDays: Date[]): CalendarLayoutResult {
  if (bookings.length === 0 || calendarDays.length === 0) {
    return { rows: [], queryColors: new Map(), maxRows: 0, dayColumns: [] };
  }

  // Step 1: Group bookings by day
  const dayColumns = groupBookingsByDay(bookings, calendarDays);

  // Step 2: Get unique queries
  const queries = getUniqueQueries(bookings);

  // Step 3: Assign queries to rows (keeping same query in same row)
  const rows = assignQueriesToRows(queries, dayColumns);

  // Step 4: Allocate colors with neighbor awareness
  const queryColors = allocateEnhancedColors(rows, dayColumns);

  return {
    rows,
    queryColors,
    maxRows: rows.length,
    dayColumns,
  };
}
