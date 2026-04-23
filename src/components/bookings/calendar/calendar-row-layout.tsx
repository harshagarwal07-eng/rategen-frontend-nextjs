"use client";

import { startOfDay, isSameDay, addDays, differenceInDays } from "date-fns";
import type { BookingWithActivity } from "@/types/ops-bookings";
import { allocateNeighborAwareColors } from "@/lib/query-color-generator";

export interface BookingEvent {
  id: string; // unique identifier for this booking event (query_id)
  queryId: string;
  shortQueryId: string;
  dayNumbers: number[]; // array of day numbers for this query
  serviceTypes: string[];
  firstServiceName: string;
  totalServices: number; // total count of services on this date
  bookingStatus: string;
  startDate: Date;
  endDate: Date;
  row?: number; // assigned row index
  queryColor?: {
    bgColor: string;
    borderColor: string;
  };
}


/**
 * Groups bookings by query_id only - merging all services for a query into one card per day
 * Each query gets ONE card per day, showing all service types (hotel, tour, transfer) together
 */
export function extractBookingEvents(
  bookings: BookingWithActivity[]
): BookingEvent[] {
  // First, organize bookings by query_id and the actual date they occur on
  const queryDateMap = new Map<string, Map<string, any[]>>();

  bookings.forEach((booking: any) => {
    const queryId = booking.query_id;

    // Determine the date(s) this booking appears on
    const dates: Date[] = [];

    if (booking.service_type === "hotel") {
      const checkIn = booking.check_in_date ? startOfDay(new Date(booking.check_in_date)) : null;
      const checkOut = booking.check_out_date ? startOfDay(new Date(booking.check_out_date)) : null;

      if (checkIn && checkOut) {
        // Handle backwards dates (check-out before check-in) by swapping
        const startDate = checkIn <= checkOut ? checkIn : checkOut;
        const endDate = checkIn <= checkOut ? checkOut : checkIn;

        // Hotel spans from check-in to check-out (inclusive on start day, exclusive on end)
        let currentDate = new Date(startDate);
        while (currentDate < endDate) {
          dates.push(new Date(currentDate));
          currentDate = addDays(currentDate, 1);
        }
      } else if (checkIn) {
        // If only check-in exists, show on that day
        dates.push(checkIn);
      }
    } else if (booking.service_type === "tour") {
      const tourDate = booking.tour_date ? startOfDay(new Date(booking.tour_date)) : null;
      if (tourDate) dates.push(tourDate);
    } else if (booking.service_type === "transfer") {
      const pickupDate = booking.pickup_date ? startOfDay(new Date(booking.pickup_date)) : null;
      if (pickupDate) dates.push(pickupDate);
    }

    // Add this booking to each date it appears on
    dates.forEach(date => {
      if (!queryDateMap.has(queryId)) {
        queryDateMap.set(queryId, new Map());
      }

      const dateMap = queryDateMap.get(queryId)!;
      const dateKey = date.toISOString();

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }

      dateMap.get(dateKey)!.push(booking);
    });
  });

  // Now create events - one event per query per date
  const events: BookingEvent[] = [];

  queryDateMap.forEach((dateMap, queryId) => {
    dateMap.forEach((bookingsOnDate, dateKey) => {
      const date = new Date(dateKey);

      // Aggregate all service types and day numbers on this date
      const serviceTypes = new Set<string>();
      const dayNumbers = new Set<number>();
      let firstServiceName = "Unknown Service";
      let bookingStatus = "pending";
      let shortQueryId = "";

      bookingsOnDate.forEach((booking: any) => {
        serviceTypes.add(booking.service_type);
        dayNumbers.add(booking.day_number || 1);

        if (!shortQueryId) {
          shortQueryId = booking.short_query_id || "";
        }

        if (firstServiceName === "Unknown Service") {
          firstServiceName = booking.service_name || "Unknown Service";
        }

        // Update booking status priority: confirmed > on_hold > pending
        const newStatus = booking.booking_status;
        if (
          newStatus === "confirmed" ||
          (newStatus === "on_hold" && bookingStatus === "pending")
        ) {
          bookingStatus = newStatus;
        }
      });

      events.push({
        id: `${queryId}-${dateKey}`,
        queryId,
        shortQueryId,
        dayNumbers: Array.from(dayNumbers).sort((a, b) => a - b),
        serviceTypes: Array.from(serviceTypes),
        firstServiceName,
        totalServices: bookingsOnDate.length, // Count of actual bookings on this date
        bookingStatus,
        startDate: date,
        endDate: date,
      });
    });
  });

  return events;
}

/**
 * Row allocation algorithm - assigns events to rows with no conflicts
 * All events with same query_id must be in the same row
 */
export function allocateRows(
  events: BookingEvent[],
  days: Date[]
): BookingEvent[] {
  // Group events by query_id
  const eventsByQuery = new Map<string, BookingEvent[]>();
  events.forEach((event) => {
    if (!eventsByQuery.has(event.queryId)) {
      eventsByQuery.set(event.queryId, []);
    }
    eventsByQuery.get(event.queryId)!.push(event);
  });

  // Sort query groups by earliest start date
  const sortedQueries = Array.from(eventsByQuery.entries()).sort((a, b) => {
    const minStartA = Math.min(...a[1].map(e => e.startDate.getTime()));
    const minStartB = Math.min(...b[1].map(e => e.startDate.getTime()));
    return minStartA - minStartB;
  });

  // Track which rows are occupied for each day
  const dayOccupancy = new Map<string, Set<number>>();
  days.forEach((day) => {
    dayOccupancy.set(day.toISOString(), new Set());
  });

  const allEvents: BookingEvent[] = [];
  const queryRowMapping: Array<{ queryId: string; row: number }> = [];

  // Assign each query's events to the same row
  sortedQueries.forEach(([queryId, queryEvents]) => {
    let assignedRow = 0;

    // Find the first row that's free for ALL events in this query
    while (true) {
      let isRowAvailable = true;

      // Check if this row is free for all days across all events in this query
      for (const event of queryEvents) {
        let currentDate = new Date(event.startDate);
        while (currentDate <= event.endDate) {
          const dayKey = currentDate.toISOString();
          const occupiedRows = dayOccupancy.get(dayKey);

          if (occupiedRows?.has(assignedRow)) {
            isRowAvailable = false;
            break;
          }

          currentDate = addDays(currentDate, 1);
        }
        if (!isRowAvailable) break;
      }

      if (isRowAvailable) {
        // Assign this row to all events in the query
        queryEvents.forEach((event) => {
          event.row = assignedRow;

          // Mark this row as occupied for all days in this event's range
          let currentDate = new Date(event.startDate);
          while (currentDate <= event.endDate) {
            const dayKey = currentDate.toISOString();
            dayOccupancy.get(dayKey)?.add(assignedRow);
            currentDate = addDays(currentDate, 1);
          }

          allEvents.push(event);
        });

        // Store query-row mapping for color allocation
        queryRowMapping.push({ queryId, row: assignedRow });
        break;
      }

      assignedRow++;
    }
  });

  // Allocate neighbor-aware colors
  const colorMap = allocateNeighborAwareColors(queryRowMapping);

  // Assign colors to events
  allEvents.forEach((event) => {
    const color = colorMap.get(event.queryId);
    if (color) {
      event.queryColor = {
        bgColor: color.bgColor,
        borderColor: color.borderColor,
      };
    }
  });

  return allEvents;
}

/**
 * Filter events that overlap with the visible date range
 */
export function filterVisibleEvents(
  events: BookingEvent[],
  days: Date[]
): BookingEvent[] {
  if (days.length === 0) return [];

  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  return events.filter((event) => {
    // Event overlaps if: event.start <= range.end AND event.end >= range.start
    return event.startDate <= rangeEnd && event.endDate >= rangeStart;
  });
}
