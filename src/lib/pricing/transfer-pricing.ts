/**
 * Transfer Pricing Calculator
 *
 * Handles transfer pricing including:
 * - SIC (Shared) vs PVT (Private) pricing
 * - Vehicle selection based on capacity
 * - Similar to tour pricing but simpler (no addons)
 */

import { isDateInSeason } from "./date-utils";

// Type definitions for transfer data from vw_transfers_packages
export interface TransferVehicle {
  vehicle_type?: string; // Optional - may not always be specified
  capacity: string; // "3", "6", "10"
  rate: number;
  brand?: string;
}

export interface TransferSeason {
  dates: string; // "All Season" or date ranges
  order?: number;
  sic_rate_adult: number;
  sic_rate_child: number;
  pvt_rate: Record<string, unknown>; // Usually empty object
  per_vehicle_rate: TransferVehicle[];
}

export interface TransferPackage {
  id: string;
  transfer_id: string;
  transfer_name: string;
  package_name: string;
  route?: string;
  mode?: string; // "van", "sedan", etc.
  seasons: TransferSeason[];
  package_child_policy?: string;
  transfer_child_policy?: string;
  currency: string;
  country: string;
  city: string;
}

// Input/Output types
export interface TransferPricingInput {
  transfer: TransferPackage;
  date: Date; // Transfer date
  adults: number;
  children: { age: number }[];
  type: "SIC" | "PVT"; // Default: "PVT" as per decision
}

export interface TransferPricingBreakdown {
  transfer_name: string;
  package_name: string;
  route?: string;
  type: "SIC" | "PVT";
  vehicle_used?: string;
  total_cost: number;
  currency: string;
  country: string;
  city: string;
}

/**
 * Main transfer pricing calculation function
 */
export async function calculateTransferPricing(
  input: TransferPricingInput
): Promise<TransferPricingBreakdown> {
  const { transfer, date, adults, children = [], type } = input;

  console.log(`[Transfer Pricing] Calculating for ${transfer.transfer_name}`);
  console.log(`[Transfer Pricing] Package: ${transfer.package_name}`);
  console.log(`[Transfer Pricing] Route: ${transfer.route || "N/A"}`);
  console.log(`[Transfer Pricing] Type: ${type}`);
  console.log(
    `[Transfer Pricing] Guests: ${adults} adults, ${children.length} children`
  );

  // Step 1: Find applicable season for the transfer date
  const season = findApplicableSeason(transfer.seasons, date);

  if (!season) {
    throw new Error(
      `No applicable season found for transfer: ${transfer.transfer_name} on ${date}`
    );
  }

  console.log(`[Transfer Pricing] Using season: ${season.dates}`);

  // Step 2: Calculate cost (SIC vs PVT)
  let totalCost = 0;
  let vehicleUsed: string | undefined;

  if (type === "SIC") {
    // Shared: per person pricing
    totalCost =
      season.sic_rate_adult * adults +
      season.sic_rate_child * children.length;
    console.log(
      `[Transfer Pricing] SIC pricing: ${adults} adults @ ${season.sic_rate_adult} + ${children.length} children @ ${season.sic_rate_child} = ${totalCost}`
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
        totalCost = rate;
        console.log(
          `[Transfer Pricing] PVT per-pax pricing: ${totalPax} pax @ ${rate} = ${totalCost}`
        );
      } else {
        // Find closest higher pax rate
        const availablePax = Object.keys(season.pvt_rate)
          .map(k => parseInt(k.replace('pax', '')))
          .filter(p => !isNaN(p))
          .sort((a, b) => a - b);

        const closestPax = availablePax.find(p => p >= totalPax) || availablePax[availablePax.length - 1];
        totalCost = (season.pvt_rate as Record<string, number>)[`${closestPax}pax`] || 0;

        console.log(
          `[Transfer Pricing] PVT per-pax pricing: ${totalPax} pax → using ${closestPax}pax rate @ ${totalCost}`
        );
      }
    } else {
      // Fall back to vehicle-based pricing
      const vehicle = selectVehicle(season.per_vehicle_rate, totalPax);

      if (!vehicle) {
        throw new Error(
          `No suitable vehicle found for ${totalPax} passengers on transfer: ${transfer.transfer_name}`
        );
      }

      totalCost = vehicle.rate;
      vehicleUsed = vehicle.vehicle_type
        ? `${vehicle.vehicle_type} (${vehicle.capacity} pax)`
        : `Vehicle (${vehicle.capacity} pax)`;
      console.log(
        `[Transfer Pricing] PVT vehicle pricing: ${totalPax} pax → ${vehicleUsed} @ ${totalCost}`
      );
    }
  }

  console.log(
    `[Transfer Pricing] Total: ${totalCost} ${transfer.currency}`
  );

  return {
    transfer_name: transfer.transfer_name,
    package_name: transfer.package_name,
    route: transfer.route,
    type,
    vehicle_used: vehicleUsed,
    total_cost: totalCost,
    currency: transfer.currency,
    country: transfer.country,
    city: transfer.city,
  };
}

/**
 * Find the season that matches the transfer date
 * Handles "All Season" and specific date ranges
 */
function findApplicableSeason(
  seasons: TransferSeason[],
  transferDate: Date
): TransferSeason | null {
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
      if (isDateInSeason(transferDate, season.dates)) {
        return season;
      }
    } catch (error) {
      console.error(
        `[Transfer Pricing] Error checking season dates "${season.dates}":`,
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
  vehicles: TransferVehicle[],
  totalPax: number
): TransferVehicle | null {
  if (!vehicles || vehicles.length === 0) {
    console.warn("[Transfer Pricing] No vehicles available");
    return null;
  }

  // Sort by capacity ascending
  const sorted = [...vehicles].sort(
    (a, b) => parseInt(a.capacity, 10) - parseInt(b.capacity, 10)
  );

  console.log(
    `[Transfer Pricing] Available vehicles:`,
    sorted.map((v) =>
      v.vehicle_type ? `${v.vehicle_type}(${v.capacity})` : `${v.capacity} pax`
    )
  );

  // Find smallest that fits
  const selected = sorted.find((v) => parseInt(v.capacity, 10) >= totalPax);

  if (selected) {
    console.log(
      `[Transfer Pricing] Selected: ${selected.vehicle_type || "Vehicle"} (capacity: ${selected.capacity}, rate: ${selected.rate})`
    );
    return selected;
  }

  // If none fit, return largest available
  const largest = sorted[sorted.length - 1];
  console.warn(
    `[Transfer Pricing] No vehicle fits ${totalPax} pax, using largest: ${largest.vehicle_type || "Vehicle"} (${largest.capacity})`
  );
  return largest;
}
