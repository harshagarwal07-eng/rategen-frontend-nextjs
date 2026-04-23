/**
 * Tour Pricing Calculator
 *
 * Handles tour pricing including:
 * - SIC (Seat-in-Coach) vs PVT (Private) pricing
 * - Vehicle selection based on capacity
 * - Tour addons
 * - Transfer inclusion detection
 */

import { isDateInSeason } from "./date-utils";

// Type definitions for tour data from vw_tours_packages
export interface TourVehicle {
  vehicle_type: string; // "Sedan", "Van", "Coach"
  capacity: string; // "3", "10", "20"
  rate: number;
  brand?: string;
}

export interface TourSeason {
  dates: string; // "All Season" or date ranges
  order: number;
  sic_rate_adult: number;
  sic_rate_child: number;
  pvt_rate: Record<string, unknown>; // Usually empty object
  per_vehicle_rate: TourVehicle[];
  includes_transfer: boolean;
}

export interface TourAddon {
  id: string;
  name: string;
  ticket_only_rate_adult: number;
  ticket_only_rate_child: number;
}

export interface TourPackage {
  id: string;
  tour_id: string;
  tour_name: string;
  package_name: string;
  seasons: TourSeason[];
  add_ons: TourAddon[];
  package_child_policy?: string;
  tour_child_policy?: string;
  currency: string;
  country: string;
  city: string;
}

// Input/Output types
export interface TourPricingInput {
  tour: TourPackage;
  dates: Date[]; // Tour dates (usually single date for day tours)
  adults: number;
  children: { age: number }[];
  type: "SIC" | "PVT"; // Default: "PVT" as per decision
  addon_ids: string[];
}

export interface TourPricingBreakdown {
  tour_name: string;
  package_name: string;
  type: "SIC" | "PVT";
  vehicle_used?: string;
  base_cost: number;
  addons_cost: number;
  addons: Array<{ name: string; cost: number }>;
  includes_transfer: boolean;
  total_cost: number;
  currency: string;
  country: string;
  city: string;
}

/**
 * Main tour pricing calculation function
 */
export async function calculateTourPricing(
  input: TourPricingInput
): Promise<TourPricingBreakdown> {
  const { tour, dates, adults, children = [], type, addon_ids } = input;

  console.log(`[Tour Pricing] Calculating for ${tour.tour_name}`);
  console.log(`[Tour Pricing] Package: ${tour.package_name}`);
  console.log(`[Tour Pricing] Type: ${type}`);
  console.log(
    `[Tour Pricing] Guests: ${adults} adults, ${children.length} children`
  );

  // Step 1: Find applicable season for the tour dates
  const season = findApplicableSeason(tour.seasons, dates[0]);

  if (!season) {
    throw new Error(
      `No applicable season found for tour: ${tour.tour_name} on ${dates[0]}`
    );
  }

  console.log(`[Tour Pricing] Using season: ${season.dates}`);

  // Step 2: Calculate base cost (SIC vs PVT)
  let baseCost = 0;
  let vehicleUsed: string | undefined;

  if (type === "SIC") {
    // Seat-in-Coach: per person pricing
    baseCost =
      season.sic_rate_adult * adults + season.sic_rate_child * children.length;
    console.log(
      `[Tour Pricing] SIC pricing: ${adults} adults @ ${season.sic_rate_adult} + ${children.length} children @ ${season.sic_rate_child} = ${baseCost}`
    );
  } else {
    // Private: Check for per-pax rates first, then vehicle-based pricing
    const totalPax = adults + children.length;

    // Check if pvt_rate has per-pax pricing (e.g., {1pax: 200, 2pax: 100})
    const hasPvtRate = season.pvt_rate && typeof season.pvt_rate === 'object' && Object.keys(season.pvt_rate).length > 0;

    if (hasPvtRate) {
      // Use per-pax private rates
      const paxKey = `${totalPax}pax`;
      const rate = (season.pvt_rate as Record<string, number>)[paxKey];

      if (rate !== undefined) {
        baseCost = rate;
        console.log(
          `[Tour Pricing] PVT per-pax pricing: ${totalPax} pax @ ${rate} = ${baseCost}`
        );
      } else {
        // Find closest higher pax rate
        const availablePax = Object.keys(season.pvt_rate)
          .map(k => parseInt(k.replace('pax', '')))
          .filter(p => !isNaN(p))
          .sort((a, b) => a - b);

        const closestPax = availablePax.find(p => p >= totalPax) || availablePax[availablePax.length - 1];
        baseCost = (season.pvt_rate as Record<string, number>)[`${closestPax}pax`] || 0;

        console.log(
          `[Tour Pricing] PVT per-pax pricing: ${totalPax} pax → using ${closestPax}pax rate @ ${baseCost}`
        );
      }
    } else {
      // Fall back to vehicle-based pricing
      const vehicle = selectVehicle(season.per_vehicle_rate, totalPax);

      if (!vehicle) {
        throw new Error(
          `No suitable vehicle found for ${totalPax} passengers on tour: ${tour.tour_name}`
        );
      }

      baseCost = vehicle.rate;
      vehicleUsed = `${vehicle.vehicle_type} (${vehicle.capacity} pax)`;
      console.log(
        `[Tour Pricing] PVT vehicle pricing: ${totalPax} pax → ${vehicleUsed} @ ${baseCost}`
      );
    }
  }

  // Step 3: Calculate addons cost
  const selectedAddons = tour.add_ons.filter((addon) =>
    addon_ids.includes(addon.id)
  );

  const addonsBreakdown = selectedAddons.map((addon) => {
    const addonCost =
      addon.ticket_only_rate_adult * adults +
      addon.ticket_only_rate_child * children.length;

    console.log(
      `[Tour Pricing] Addon "${addon.name}": ${adults} adults @ ${addon.ticket_only_rate_adult} + ${children.length} children @ ${addon.ticket_only_rate_child} = ${addonCost}`
    );

    return {
      name: addon.name,
      cost: addonCost,
    };
  });

  const addonsCost = addonsBreakdown.reduce((sum, a) => sum + a.cost, 0);
  const totalCost = baseCost + addonsCost;

  console.log(
    `[Tour Pricing] Total: ${baseCost} (base) + ${addonsCost} (addons) = ${totalCost} ${tour.currency}`
  );

  return {
    tour_name: tour.tour_name,
    package_name: tour.package_name,
    type,
    vehicle_used: vehicleUsed,
    base_cost: baseCost,
    addons_cost: addonsCost,
    addons: addonsBreakdown,
    includes_transfer: season.includes_transfer,
    total_cost: totalCost,
    currency: tour.currency,
    country: tour.country,
    city: tour.city,
  };
}

/**
 * Find the season that matches the tour date
 * Handles "All Season" and specific date ranges
 */
function findApplicableSeason(
  seasons: TourSeason[],
  tourDate: Date
): TourSeason | null {
  // First, try to find "All Season"
  const allSeasonSeason = seasons.find(
    (s) => s.dates === "All Season" || s.dates.toLowerCase() === "all season"
  );

  if (allSeasonSeason) {
    return allSeasonSeason;
  }

  // Otherwise, find season that includes this date
  for (const season of seasons) {
    try {
      if (isDateInSeason(tourDate, season.dates)) {
        return season;
      }
    } catch (error) {
      console.error(
        `[Tour Pricing] Error checking season dates "${season.dates}":`,
        error
      );
      continue;
    }
  }

  return null;
}

/**
 * Select the smallest vehicle that fits the total passengers
 * As per decision #3: Choose smallest vehicle that fits
 */
function selectVehicle(
  vehicles: TourVehicle[],
  totalPax: number
): TourVehicle | null {
  if (!vehicles || vehicles.length === 0) {
    console.warn("[Tour Pricing] No vehicles available");
    return null;
  }

  // Sort by capacity ascending
  const sorted = [...vehicles].sort(
    (a, b) => parseInt(a.capacity, 10) - parseInt(b.capacity, 10)
  );

  console.log(
    `[Tour Pricing] Available vehicles:`,
    sorted.map((v) => `${v.vehicle_type}(${v.capacity})`)
  );

  // Find smallest that fits
  const selected = sorted.find((v) => parseInt(v.capacity, 10) >= totalPax);

  if (selected) {
    console.log(
      `[Tour Pricing] Selected: ${selected.vehicle_type} (capacity: ${selected.capacity}, rate: ${selected.rate})`
    );
    return selected;
  }

  // If none fit, return largest available
  const largest = sorted[sorted.length - 1];
  console.warn(
    `[Tour Pricing] No vehicle fits ${totalPax} pax, using largest: ${largest.vehicle_type} (${largest.capacity})`
  );
  return largest;
}
