/**
 * Hotel Pricing Calculator
 *
 * Handles complex hotel pricing including:
 * - Multi-season date overlaps with pro-rating
 * - Multiple room requirements
 * - Extra bed calculations
 * - Child policy application
 * - Max occupancy parsing ("[2A + 3C] or [2A + 2Teens]")
 */

import {
  parseDateRanges,
  calculateNightsInSeason,
  datesOverlap,
  type DateRange,
} from "./date-utils";
import { parseChildPolicy, getChildRate } from "./child-policy-parser";

// Type definitions for hotel data from vw_hotel_rooms
export interface HotelSeason {
  dates: string; // "01 Nov 25 - 21 Nov 25" or "All Season"
  rate_per_night: number;
  single_pp: number;
  double_pp: number;
  child_no_bed: number;
  extra_bed_pp: number;
}

export interface HotelRoom {
  id: string;
  hotel_id: string;
  hotel_name: string;
  room_category: string;
  meal_plan: string;
  max_occupancy: string; // "[2A + 3C] or [2A + 2Teens]"
  seasons: HotelSeason[];
  other_details?: string; // Contains child policy text
  hotel_currency: string;
  hotel_country: string;
  hotel_city: string;
  star_rating: number;
}

// Input/Output types
export interface HotelPricingInput {
  hotel: HotelRoom;
  check_in: Date;
  check_out: Date;
  adults: number;
  children: { age: number }[];
}

export interface SeasonBreakdown {
  season: string; // Original season dates string
  nights: number;
  rate_per_night: number;
  rooms: number;
  extra_beds: number;
  base_cost: number;
  extra_bed_cost: number;
  child_cost: number;
  total: number;
}

export interface HotelPricingBreakdown {
  hotel_name: string;
  room_category: string;
  meal_plan: string;
  check_in: Date;
  check_out: Date;
  rooms_needed: number;
  season_breakdown: SeasonBreakdown[];
  total_cost: number;
  currency: string;
  country: string;
  city: string;
}

interface OccupancyResult {
  roomsNeeded: number;
  extraBeds: number;
}

/**
 * Main hotel pricing calculation function
 */
export async function calculateHotelPricing(
  input: HotelPricingInput
): Promise<HotelPricingBreakdown> {
  const { hotel, check_in, check_out, adults, children = [] } = input;

  console.log(`[Hotel Pricing] Calculating for ${hotel.hotel_name}`);
  console.log(`[Hotel Pricing] Check-in: ${check_in}, Check-out: ${check_out}`);
  console.log(
    `[Hotel Pricing] Guests: ${adults} adults, ${children.length} children`
  );

  // Step 1: Parse max occupancy & determine rooms/extra beds needed
  const { roomsNeeded, extraBeds } = parseMaxOccupancyAndCalculate(
    hotel.max_occupancy,
    adults,
    children.length
  );

  console.log(
    `[Hotel Pricing] Rooms needed: ${roomsNeeded}, Extra beds: ${extraBeds}`
  );

  // Step 2: Find applicable seasons that overlap with booking dates
  const applicableSeasons = getApplicableSeasons(
    hotel.seasons,
    check_in,
    check_out
  );

  if (applicableSeasons.length === 0) {
    throw new Error(
      `No applicable seasons found for ${hotel.hotel_name} between ${check_in} and ${check_out}`
    );
  }

  console.log(
    `[Hotel Pricing] Found ${applicableSeasons.length} applicable season(s)`
  );

  // Step 3: Parse child policy
  const policyText = hotel.other_details || "";
  const childPolicy = parseChildPolicy(policyText);

  console.log(
    `[Hotel Pricing] Child policy rules: ${childPolicy.length} rule(s) found`
  );

  // Step 4: Calculate costs for each season
  const seasonBreakdown: SeasonBreakdown[] = applicableSeasons.map(
    (season) => {
      const nights = calculateNightsInSeason(
        season.dateRanges,
        check_in,
        check_out
      );

      // Base room cost
      const baseCost = season.season.rate_per_night * nights * roomsNeeded;

      // Extra bed cost
      const extraBedCost = season.season.extra_bed_pp * extraBeds * nights;

      // Child cost (based on policy)
      let childCost = 0;
      for (const child of children) {
        const childRate = getChildRate(
          childPolicy,
          child.age,
          season.season.rate_per_night
        );
        childCost += childRate * nights;
      }

      return {
        season: season.season.dates,
        nights,
        rate_per_night: season.season.rate_per_night,
        rooms: roomsNeeded,
        extra_beds: extraBeds,
        base_cost: baseCost,
        extra_bed_cost: extraBedCost,
        child_cost: childCost,
        total: baseCost + extraBedCost + childCost,
      };
    }
  );

  const totalCost = seasonBreakdown.reduce((sum, s) => sum + s.total, 0);

  console.log(`[Hotel Pricing] Total cost: ${totalCost} ${hotel.hotel_currency}`);

  return {
    hotel_name: hotel.hotel_name,
    room_category: hotel.room_category,
    meal_plan: hotel.meal_plan,
    check_in,
    check_out,
    rooms_needed: roomsNeeded,
    season_breakdown: seasonBreakdown,
    total_cost: totalCost,
    currency: hotel.hotel_currency,
    country: hotel.hotel_country,
    city: hotel.hotel_city,
  };
}

/**
 * Parse max occupancy string and calculate rooms/extra beds needed
 * Handles formats like: "[2A + 3C] or [2A + 2Teens]"
 * As per decision #1: Can select either option based on passenger composition
 */
function parseMaxOccupancyAndCalculate(
  maxOccupancy: string,
  adults: number,
  childrenCount: number
): OccupancyResult {
  console.log(`[Occupancy] Parsing: "${maxOccupancy}"`);

  // Extract ALL options (handle "or" separator)
  const regex = /\[?(\d+)A(?:\s*\+\s*(\d+)(?:C|Teens|Teen|child|children))?\]?/gi;
  const matches = Array.from(maxOccupancy.matchAll(regex));

  if (matches.length === 0) {
    console.warn("[Occupancy] No matches found, using fallback: 2A capacity");
    // Fallback: assume 2A capacity
    return {
      roomsNeeded: Math.ceil(adults / 2),
      extraBeds: Math.max(0, childrenCount - 1),
    };
  }

  // Parse all options
  const options = matches.map((m) => ({
    maxAdults: parseInt(m[1], 10),
    maxChildren: m[2] ? parseInt(m[2], 10) : 0,
  }));

  console.log(`[Occupancy] Found ${options.length} option(s):`, options);

  // Select best option that fits the passengers
  const totalPax = adults + childrenCount;
  const bestOption =
    options.find((opt) => opt.maxAdults + opt.maxChildren >= totalPax) ||
    options[0]; // Default to first if none fit

  console.log(`[Occupancy] Selected option:`, bestOption);

  const roomCapacity = bestOption.maxAdults + bestOption.maxChildren;

  // Case 1: Everyone fits in 1 room
  if (totalPax <= roomCapacity) {
    console.log("[Occupancy] Fits in 1 room");
    return {
      roomsNeeded: 1,
      extraBeds: 0,
    };
  }

  // Case 2: Need multiple rooms
  const roomsNeeded = Math.ceil(adults / bestOption.maxAdults);
  const remainingChildren = Math.max(
    0,
    childrenCount - bestOption.maxChildren * roomsNeeded
  );

  console.log(
    `[Occupancy] Needs ${roomsNeeded} rooms + ${remainingChildren} extra beds`
  );

  return {
    roomsNeeded,
    extraBeds: remainingChildren,
  };
}

/**
 * Find seasons that overlap with booking dates and return with parsed date ranges
 */
function getApplicableSeasons(
  seasons: HotelSeason[],
  checkIn: Date,
  checkOut: Date
): Array<{ season: HotelSeason; dateRanges: DateRange[] }> {
  return seasons
    .map((season) => {
      try {
        const dateRanges = parseDateRanges(season.dates);

        // Filter to only ranges that overlap with booking
        const overlappingRanges = dateRanges.filter((range) =>
          datesOverlap(checkIn, checkOut, range.start, range.end)
        );

        if (overlappingRanges.length === 0) {
          return null;
        }

        return { season, dateRanges: overlappingRanges };
      } catch (error) {
        console.error(
          `[Hotel Pricing] Error parsing season dates "${season.dates}":`,
          error
        );
        return null;
      }
    })
    .filter((s): s is { season: HotelSeason; dateRanges: DateRange[] } =>
      Boolean(s)
    );
}
