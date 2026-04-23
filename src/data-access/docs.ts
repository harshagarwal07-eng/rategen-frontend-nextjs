"use server";

import { EditDocFormData, UpdateDocContent, LibraryType, IVehicle, IDriver, IRestaurant, IGuide } from "@/types/docs";
import { createClient } from "../utils/supabase/server";
import { getCurrentUser } from "./auth";
import { IOption } from "@/types/common";

export const getDocById = async (id: number) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const { data, error } = await supabase.from("vw_docs").select("*").eq("id", id).eq("dmc_id", user.dmc.id).single();

  if (error) return null;
  return data;
};

export const getAllDocsByUser = async (type: string, country: string) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const query = supabase
    .from("vw_docs")
    .select("*")
    .eq("dmc_id", user.dmc.id)
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (country) query.eq("country", country);

  const { data, error } = await query;

  if (error) throw error;

  return data;
};

export const createDoc = async ({
  type,
  country,
  content,
  nights,
  service_type,
  state,
}: {
  type: string;
  country: string;
  content: string;
  nights?: number;
  service_type?: string;
  state?: string;
}) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const insertData: any = {
    type,
    country,
    state,
    content,
    created_by: user.id,
    dmc_id: user.dmc.id,
    is_active: true,
  };

  if (nights !== undefined) {
    insertData.nights = nights;
  }

  if (service_type !== undefined) {
    insertData.service_type = service_type;
  }

  const { data, error } = await supabase.from("docs").insert(insertData).select("id").single();

  if (error) return { error: error.message };

  return { data };
};

export const updateDoc = async (id: number, newData: EditDocFormData | UpdateDocContent) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const { data, error } = await supabase.from("docs").update(newData).eq("id", id).eq("dmc_id", user.dmc.id).single();

  if (error) return { error: error.message };

  return { data };
};

export const deleteDoc = async (id: number) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const { error } = await supabase.from("docs").delete().eq("id", id).eq("dmc_id", user.dmc.id);

  if (error) return { error: error.message };

  return { success: true };
};

/**
 * Fetch notes (T&C) for a DMC - used by travel agent workflow
 * Returns concatenated content of all active notes for the DMC
 */
export const getNotesForDmc = async (dmcId: string, country?: string): Promise<string | null> => {
  const supabase = await createClient(); // Use service role for server-side

  const query = supabase
    .from("vw_docs")
    .select("content")
    .eq("dmc_id", dmcId)
    .eq("type", "notes")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (country) query.eq("country_code", country);

  const { data, error } = await query;

  if (error) {
    console.error("[getNotesForDmc] Error fetching notes:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // Concatenate all notes content
  return data.map((doc) => doc.content).join("\n\n---\n\n");
};

/**
 * Fetch sample itinerary for a DMC based on nights and country
 * Used by Itinerary Creator as reference when user hasn't provided detailed itinerary
 *
 * @param dmcId - DMC ID
 * @param nights - Number of nights (to match sample itinerary duration)
 * @param country - Country code (optional filter)
 * @returns Sample itinerary content or null
 */
export const getSampleItineraryForDmc = async (
  dmcId: string,
  nights: number,
  country?: string
): Promise<{ content: string; nights: number } | null> => {
  const supabase = await createClient();

  const query = supabase
    .from("vw_docs")
    .select("content, nights")
    .eq("dmc_id", dmcId)
    .eq("type", "itineraries")
    .eq("nights", nights) // Match exact nights
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1); // Get most recent sample itinerary

  if (country) query.eq("country_code", country);

  const { data, error } = await query;

  if (error) {
    console.error("[getSampleItineraryForDmc] Error fetching sample itinerary:", error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log(`[getSampleItineraryForDmc] No sample itinerary found for ${nights} nights`);
    return null;
  }

  console.log(`[getSampleItineraryForDmc] Found sample itinerary for ${nights} nights`);

  return {
    content: data[0].content,
    nights: data[0].nights,
  };
};

/**
 * Fetch all sample itineraries for the current user's DMC
 * Used in the "Manual Creation" sheet to list available sample itineraries
 */
export const getSampleItineraries = async (
  nights?: number
): Promise<
  Array<{
    id: number;
    content: string;
    nights: number;
    country_name: string;
    created_at: string;
  }>
> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  let query = supabase
    .from("vw_docs")
    .select("id, content, nights, country_name, created_at")
    .eq("dmc_id", user.dmc.id)
    .eq("type", "itineraries")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (nights) {
    query = query.eq("nights", nights);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getSampleItineraries] Error:", error);
    return [];
  }

  return (data || []) as Array<{
    id: number;
    content: string;
    nights: number;
    country_name: string;
    created_at: string;
  }>;
};

// ============================================
// LIBRARY CRUD FUNCTIONS
// ============================================

const getTableName = (type: LibraryType): string => {
  const tableMap = {
    vehicles: "vehicles_library",
    drivers: "drivers_library",
    restaurants: "restaurants_library",
    guides: "guides_library",
  };
  return tableMap[type];
};

type BaseLibraryParams = {
  page?: number;
  perPage?: number;
  sort?: { id: string; desc: boolean }[];
  status?: string[];
};

type VehicleFilterParams = BaseLibraryParams & {
  v_number?: string | null;
  brand?: string | null;
  v_type?: string | null;
  category?: string | null;
  country?: string[];
  city?: string[];
};

export const getVehicles = async (params?: VehicleFilterParams) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { page = 1, perPage = 25, sort, country, city, v_number, brand, v_type, category, status } = params || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("vehicles_library")
    .select(
      `
      *,
      rategen_suppliers!vehicles_library_supplier_id_fkey(name),
      countries!vehicles_library_country_fkey(country_name),
      cities!vehicles_library_city_fkey(city_name)
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (country?.length) query.in("country", country);
  if (city?.length) query.in("city", city);
  if (status?.length) query.in("status", status);
  if (v_number) query.ilike("v_number", `%${v_number}%`);
  if (brand) query.ilike("brand", `%${brand}%`);
  if (v_type) query.ilike("v_type", `%${v_type}%`);
  if (category) query.ilike("category", `%${category}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching vehicles: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item: any) => ({
      ...item,
      supplier_name: item.rategen_suppliers?.name || null,
      country_name: item.countries?.country_name || null,
      state_name: item.states?.state_name || null,
      city_name: item.cities?.city_name || null,
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

type DriverFilterParams = BaseLibraryParams & {
  name?: string | null;
  gender?: string[];
  payroll_type?: string[];
  country?: string[];
  city?: string[];
};

export const getDrivers = async (params?: DriverFilterParams) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { page = 1, perPage = 25, sort, country, city, name, gender, payroll_type, status } = params || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("drivers_library")
    .select(
      `
      *,
      rategen_suppliers!drivers_library_supplier_id_fkey(name),
      countries!drivers_library_country_fkey(country_name),
      cities!drivers_library_city_fkey(city_name)
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (country?.length) query.in("country", country);
  if (city?.length) query.in("city", city);
  if (gender?.length) query.in("gender", gender);
  if (payroll_type?.length) query.in("payroll_type", payroll_type);
  if (status?.length) query.in("status", status);
  if (name) query.ilike("name", `%${name}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching drivers: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item: any) => ({
      ...item,
      supplier_name: item.rategen_suppliers?.name || null,
      country_name: item.countries?.country_name || null,
      state_name: item.states?.state_name || null,
      city_name: item.cities?.city_name || null,
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

type RestaurantFilterParams = BaseLibraryParams & {
  name?: string | null;
  country?: string[];
  city?: string[];
};

export const getRestaurants = async (params?: RestaurantFilterParams) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { page = 1, perPage = 25, sort, country, city, name, status } = params || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("restaurants_library")
    .select(
      `
      *,
      countries!restaurant_library_country_fkey(country_name),
      cities!restaurant_library_city_fkey(city_name)
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (country?.length) query.in("country", country);
  if (city?.length) query.in("city", city);
  if (status?.length) query.in("status", status);
  if (name) query.ilike("name", `%${name}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching restaurants: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item: any) => ({
      ...item,
      country_name: item.countries?.country_name || null,
      state_name: item.states?.state_name || null,
      city_name: item.cities?.city_name || null,
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

type GuideFilterParams = BaseLibraryParams & {
  name?: string | null;
  gender?: string[];
  payroll_type?: string[];
  country?: string[];
  city?: string[];
};

export const getGuides = async (params?: GuideFilterParams) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { page = 1, perPage = 25, sort, country, city, name, gender, payroll_type, status } = params || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("guides_library")
    .select(
      `
      *,
      rategen_suppliers!guides_library_supplier_id_fkey(name),
      countries!guides_library_country_fkey(country_name),
      cities!guides_library_city_fkey(city_name)
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (country?.length) query.in("country", country);
  if (city?.length) query.in("city", city);
  if (gender?.length) query.in("gender", gender);
  if (payroll_type?.length) query.in("payroll_type", payroll_type);
  if (status?.length) query.in("status", status);
  if (name) query.ilike("name", `%${name}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching guides: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item: any) => ({
      ...item,
      supplier_name: item.rategen_suppliers?.name || null,
      country_name: item.countries?.country_name || null,
      state_name: item.states?.state_name || null,
      city_name: item.cities?.city_name || null,
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
};

export const addLibraryItem = async (type: LibraryType, formData: IVehicle | IDriver | IRestaurant | IGuide) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  const { data, error } = await supabase
    .from(getTableName(type))
    .insert({ ...formData, dmc_id: user.dmc.id })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
};

export const updateLibraryItem = async (
  type: LibraryType,
  id: string,
  formData: IVehicle | IDriver | IRestaurant | IGuide
) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  // Remove fields from joined tables that don't exist in the actual table
  const sanitizedData = { ...formData };
  delete (sanitizedData as any).rategen_suppliers;
  delete (sanitizedData as any).supplier_name;
  delete (sanitizedData as any).countries;
  delete (sanitizedData as any).cities;
  delete (sanitizedData as any).states;
  delete (sanitizedData as any).country_name;
  delete (sanitizedData as any).city_name;
  delete (sanitizedData as any).state_name;

  const { data, error } = await supabase
    .from(getTableName(type))
    .update(sanitizedData)
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { data };
};

export const deleteLibraryItem = async (type: LibraryType, id: string) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  const { error } = await supabase.from(getTableName(type)).delete().eq("id", id).eq("dmc_id", user.dmc.id);

  if (error) return { error: error.message };
  return { success: true };
};

export const getVehicleOptions = async (supplierId?: string, vehicleType?: string): Promise<IOption[]> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  const query = supabase
    .from("vehicles_library")
    .select("id, brand, category, v_number, v_type, supplier_id")
    .eq("dmc_id", user.dmc.id)
    .eq("status", "active")
    .order("brand", { ascending: true });

  if (supplierId) query.eq("supplier_id", supplierId);
  if (vehicleType) query.eq("v_type", vehicleType);

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching vehicle options: ${error.message}`);
    return [];
  }

  return (
    data?.map((vehicle) => ({
      label: `${vehicle.brand || ""} ${vehicle.category || vehicle.v_type || ""} (${vehicle.v_number || ""})`.trim(),
      value: vehicle.id,
    })) || []
  );
};

export const getDriverOptions = async (supplierId?: string): Promise<IOption[]> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  const query = supabase
    .from("drivers_library")
    .select("id, name, phone, gender, supplier_id")
    .eq("dmc_id", user.dmc.id)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (supplierId) query.eq("supplier_id", supplierId);

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching driver options: ${error.message}`);
    return [];
  }

  return (
    data?.map((driver) => ({
      label: `${driver.name} (${driver.phone})`,
      value: driver.id,
    })) || []
  );
};

export const getRestaurantOptions = async (): Promise<IOption[]> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  const { data, error } = await supabase
    .from("restaurants_library")
    .select(
      `
      id,
      name,
      cities!restaurant_library_city_fkey(city_name)
    `
    )
    .eq("dmc_id", user.dmc.id)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    console.error(`Error fetching restaurant options: ${error.message}`);
    return [];
  }

  return (
    data?.map((restaurant: any) => ({
      label: restaurant.cities?.city_name ? `${restaurant.name} - ${restaurant.cities.city_name}` : restaurant.name,
      value: restaurant.id,
    })) || []
  );
};

export const getLibraryItemsBySupplier = async (type: LibraryType, supplierId: string) => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], error: "User not found" };

  const selectClause =
    type === "restaurants"
      ? `*, countries!restaurant_library_country_fkey(country_name), cities!restaurant_library_city_fkey(city_name)`
      : `*`;

  const { data, error } = await supabase
    .from(getTableName(type))
    .select(selectClause)
    .eq("dmc_id", user.dmc.id)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  if (type === "restaurants") {
    return {
      data: (data || []).map((r: any) => ({
        ...r,
        country_name: r.countries?.country_name || null,
        city_name: r.cities?.city_name || null,
      })),
      error: null,
    };
  }

  return { data: data || [], error: null };
};

export const getGuideOptions = async (): Promise<IOption[]> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  const { data, error } = await supabase
    .from("guides_library")
    .select("id, name, phone, languages_known")
    .eq("dmc_id", user.dmc.id)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    console.error(`Error fetching guide options: ${error.message}`);
    return [];
  }

  return (
    data?.map((guide) => {
      const languages =
        guide.languages_known && guide.languages_known.length > 0 ? ` - ${guide.languages_known.join(", ")}` : "";
      return {
        label: `${guide.name} (${guide.phone})${languages}`,
        value: guide.id,
      };
    }) || []
  );
};
