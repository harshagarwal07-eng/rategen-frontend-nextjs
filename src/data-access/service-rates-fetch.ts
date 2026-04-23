"use server";

import { createClient } from "@/utils/supabase/server";

// =====================================================
// TYPES
// =====================================================

export interface HotelRateInfo {
  room_id: string;
  hotel_id: string;
  hotel_name: string;
  room_category: string;
  meal_plan?: string;
  currency: string;
  age_policy?: any;
  seasons: HotelSeason[];
}

export interface HotelSeason {
  id: string;
  season_name: string;
  date_range: string; // "01 Nov 25 - 21 Nov 25" or "All Season"
  start_date?: string;
  end_date?: string;
  rate_per_night?: number;
  single_pp?: number;
  double_pp?: number;
  triple_pp?: number;
  extra_bed_pp?: number;
  child_with_bed?: number;
  child_without_bed?: number;
}

export interface TourRateInfo {
  package_id: string;
  tour_id: string;
  tour_name: string;
  package_name: string;
  currency: string;
  age_policy?: any;
  seasons: TourSeason[];
}

export interface TourSeason {
  id: string;
  season_name: string;
  date_range: string;
  start_date?: string;
  end_date?: string;
  ticket_only_rate_adult?: number;
  ticket_only_rate_child?: number;
  ticket_only_rate_infant?: number;
  sic_rate_adult?: number;
  sic_rate_child?: number;
  pvt_rate?: number;
}

export interface TransferRateInfo {
  package_id: string;
  transfer_id: string;
  transfer_name: string;
  package_name: string;
  mode: string; // "SIC" or "PVT"
  currency: string;
  seasons: TransferSeason[];
}

export interface TransferSeason {
  id: string;
  season_name: string;
  date_range: string;
  start_date?: string;
  end_date?: string;
  sic_rate_adult?: number;
  sic_rate_child?: number;
  per_vehicle_rate?: number;
  pvt_rate?: number;
}

// =====================================================
// FETCH FUNCTIONS
// =====================================================

export async function getHotelRoomRates(roomId: string): Promise<HotelRateInfo | null> {
  const supabase = await createClient();

  // Fetch room with hotel info - seasons are stored as JSONB in the room row
  const { data: room, error } = await supabase
    .from("hotel_rooms")
    .select(
      `
      id,
      hotel_id,
      room_category,
      meal_plan,
      seasons,
      hotels!inner (
        id,
        hotel_name,
        hotel_currency,
        age_policy
      )
    `
    )
    .eq("id", roomId)
    .single();

  if (error || !room) {
    console.error("[getHotelRoomRates] Error:", error?.message);
    return null;
  }

  // Transform JSONB seasons to HotelSeason format
  // JSONB format: { dates, rate_per_night, single_pp, double_pp, child_no_bed, extra_bed_pp }
  const seasons: HotelSeason[] = ((room.seasons as any[]) || []).map((s, idx) => ({
    id: `${room.id}-season-${idx}`,
    season_name: s.dates?.includes("All") ? "All Season" : `Season ${idx + 1}`,
    date_range: s.dates || "All Season",
    rate_per_night: s.rate_per_night || 0,
    single_pp: s.single_pp || 0,
    double_pp: s.double_pp || 0,
    triple_pp: s.triple_pp || 0,
    extra_bed_pp: s.extra_bed_pp || 0,
    child_with_bed: s.child_with_bed || s.extra_bed_pp || 0,
    child_without_bed: s.child_no_bed || 0,
  }));

  return {
    room_id: room.id,
    hotel_id: room.hotel_id,
    hotel_name: (room.hotels as any)?.hotel_name || "",
    room_category: room.room_category,
    meal_plan: room.meal_plan,
    currency: (room.hotels as any)?.hotel_currency || "USD",
    age_policy: (room.hotels as any)?.age_policy,
    seasons,
  };
}

export async function getTourPackageRates(packageId: string): Promise<TourRateInfo | null> {
  const supabase = await createClient();

  // Fetch package with tour info - seasons are stored as JSONB[] in the package row
  // Note: currency is on tours table, not tour_packages
  const { data: pkg, error } = await supabase
    .from("tour_packages")
    .select(
      `
      id,
      tour_id,
      name,
      age_policy,
      seasons,
      tours!inner (
        id,
        tour_name,
        currency
      )
    `
    )
    .eq("id", packageId)
    .single();

  if (error || !pkg) {
    console.error("[getTourPackageRates] Error:", error?.message);
    return null;
  }

  // Transform JSONB[] seasons to TourSeason format
  // seasons is jsonb[] (array of jsonb objects)
  const rawSeasons = (pkg.seasons as any[]) || [];
  const seasons: TourSeason[] = rawSeasons.map((s, idx) => ({
    id: `${pkg.id}-season-${idx}`,
    season_name: s.dates?.includes("All") ? "All Season" : `Season ${idx + 1}`,
    date_range: s.dates || "All Season",
    ticket_only_rate_adult: s.ticket_only_rate_adult || 0,
    ticket_only_rate_child: s.ticket_only_rate_child || 0,
    ticket_only_rate_infant: s.ticket_only_rate_infant || 0,
    sic_rate_adult: s.sic_rate_adult || 0,
    sic_rate_child: s.sic_rate_child || 0,
    pvt_rate: s.pvt_rate || 0,
  }));

  return {
    package_id: pkg.id,
    tour_id: pkg.tour_id,
    tour_name: (pkg.tours as any)?.tour_name || "",
    package_name: pkg.name,
    currency: (pkg.tours as any)?.currency || "USD",
    age_policy: pkg.age_policy,
    seasons,
  };
}

export async function getTransferPackageRates(packageId: string): Promise<TransferRateInfo | null> {
  const supabase = await createClient();

  // Fetch package with transfer info - seasons are stored as JSONB[] in the package row
  // Note: mode and currency are on transfers table, not transfer_packages
  const { data: pkg, error } = await supabase
    .from("transfer_packages")
    .select(
      `
      id,
      transfer_id,
      name,
      seasons,
      transfers!inner (
        id,
        transfer_name,
        mode,
        currency
      )
    `
    )
    .eq("id", packageId)
    .single();

  if (error || !pkg) {
    console.error("[getTransferPackageRates] Error:", error?.message);
    return null;
  }

  // Transform JSONB[] seasons to TransferSeason format
  // seasons is jsonb[] (array of jsonb objects)
  const rawSeasons = (pkg.seasons as any[]) || [];
  const seasons: TransferSeason[] = rawSeasons.map((s, idx) => {
    // Extract per_vehicle_rate (array of vehicles with rates)
    const perVehicle = s.per_vehicle_rate || [];
    // Get the first vehicle rate as default per_vehicle_rate
    const firstVehicleRate = perVehicle.length > 0 ? perVehicle[0].rate || 0 : 0;

    return {
      id: `${pkg.id}-season-${idx}`,
      season_name: s.dates?.includes("All") ? "All Season" : `Season ${idx + 1}`,
      date_range: s.dates || "All Season",
      sic_rate_adult: s.sic_rate_adult || 0,
      sic_rate_child: s.sic_rate_child || 0,
      per_vehicle_rate: firstVehicleRate,
      pvt_rate: s.pvt_rate || firstVehicleRate,
    };
  });

  return {
    package_id: pkg.id,
    transfer_id: pkg.transfer_id,
    transfer_name: (pkg.transfers as any)?.transfer_name || "",
    package_name: pkg.name,
    mode: (pkg.transfers as any)?.mode || "PVT",
    currency: (pkg.transfers as any)?.currency || "USD",
    seasons,
  };
}

// =====================================================
// SEASON MATCHER
// =====================================================

export async function findMatchingSeason(seasons: any[], serviceDate: string): Promise<any | null> {
  if (!seasons || seasons.length === 0) return null;
  if (!serviceDate) return seasons[0]; // Default to first season

  const targetDate = new Date(serviceDate);

  for (const season of seasons) {
    // Check if "All Season" or similar
    if (season.season_name?.toLowerCase().includes("all") || season.date_range?.toLowerCase().includes("all")) {
      return season;
    }

    // If start_date and end_date are available (proper date fields)
    if (season.start_date && season.end_date) {
      const start = new Date(season.start_date);
      const end = new Date(season.end_date);
      if (targetDate >= start && targetDate <= end) {
        return season;
      }
      continue;
    }

    // Parse date_range string - supports comma-separated multi-ranges
    // e.g. "14 Apr 2026 - 10 May 2026, 01 Aug 2026 - 31 Aug 2026"
    if (season.date_range) {
      const ranges = season.date_range.split(",").map((r: string) => r.trim());
      for (const range of ranges) {
        const parsed = parseDateRange(range, targetDate.getFullYear());
        if (parsed && targetDate >= parsed.start && targetDate <= parsed.end) {
          return season;
        }
      }
    }
  }

  // No match found - return first season as default
  return seasons[0];
}

function parseDateRange(dateRange: string, defaultYear: number): { start: Date; end: Date } | null {
  try {
    // Remove season labels like "(HIGH SEASON)", "(Peak)", etc.
    const cleaned = dateRange.replace(/\([^)]*\)/g, "").trim();

    // Split by " - " or " to "
    const parts = cleaned.split(/\s*[-–]\s*|\s+to\s+/i);
    if (parts.length !== 2) return null;

    const startDate = parseFlexibleDate(parts[0].trim(), defaultYear);
    const endDate = parseFlexibleDate(parts[1].trim(), defaultYear);

    if (!startDate || !endDate) return null;

    // Handle year wrap (e.g., "Dec 15 - Jan 15")
    if (endDate < startDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return { start: startDate, end: endDate };
  } catch {
    return null;
  }
}

function parseFlexibleDate(dateStr: string, defaultYear: number): Date | null {
  try {
    // Patterns: "01 Nov 25", "Nov 01", "01 Nov", "01 Nov 2025"
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const parts = dateStr.toLowerCase().split(/\s+/);
    let day = 1,
      month = 0,
      year = defaultYear;

    for (const part of parts) {
      if (months[part.substring(0, 3)] !== undefined) {
        month = months[part.substring(0, 3)];
      } else if (/^\d{1,2}$/.test(part)) {
        const num = parseInt(part, 10);
        if (num <= 31) day = num;
      } else if (/^\d{2}$/.test(part)) {
        year = 2000 + parseInt(part, 10);
      } else if (/^\d{4}$/.test(part)) {
        year = parseInt(part, 10);
      }
    }

    return new Date(year, month, day);
  } catch {
    return null;
  }
}
