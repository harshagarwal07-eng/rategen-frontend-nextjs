"use server";

import { DatastoreSearchParams } from "@/types/datastore";
import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { getCurrentUser } from "./auth";

async function fetchTransfersStaticDataCache(query: string, column: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("transfers_datastore").select(column).ilike(column, `%${query}%`);

  if (error) return [];

  return data?.map((item) => {
    const value = item[column as keyof typeof item] as string;

    return {
      label: value,
      value: value.toLowerCase(),
    };
  });
}
export const fetchTransfersStaticData = cache(fetchTransfersStaticDataCache);

async function fetchToursStaticDataCache(query: string, column: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("tours_datastore").select(column).ilike(column, `%${query}%`);

  if (error) return [];

  return data?.map((item) => {
    const value = item[column as keyof typeof item] as string;

    return {
      label: value,
      value: value.toLowerCase(),
    };
  });
}
export const fetchToursStaticData = cache(fetchToursStaticDataCache);

async function fetchMealsStaticDataCache(query: string, column: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("meals_datastore").select(column).ilike(column, `%${query}%`);

  if (error) return [];

  return data?.map((item) => {
    const value = item[column as keyof typeof item] as string;

    return {
      label: value,
      value: value.toLowerCase(),
    };
  });
}
export const fetchMealsStaticData = cache(fetchMealsStaticDataCache);

async function fetchGuidesStaticDataCache(query: string, column: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("guides_datastore").select(column).ilike(column, `%${query}%`);

  if (error) return [];

  return data?.map((item) => {
    const value = item[column as keyof typeof item] as string;

    return {
      label: value,
      value: value.toLowerCase(),
    };
  });
}
export const fetchGuidesStaticData = cache(fetchGuidesStaticDataCache);

export async function fetchHotelsDatastoreTableData(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const { sort, country, city, "hotel name": hotelName } = params;

  const query = supabase
    .from("hotels_datastore")
    .select(
      `
      *,
      countries!hotels_datastore_hotel_country_fkey(country_name),
      cities!hotels_datastore_hotel_city_fkey(city_name)
    `,
      { count: "exact" }
    )
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    });

  if (country?.length > 0) query.in("country", country);
  if (city?.length > 0) query.in("city", city);
  if (hotelName) query.ilike("hotel_name", `%${hotelName}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching hotels: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export async function fetchToursDatastoreTableData(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const { sort, country, city, "tour name": tourName } = params;

  const query = supabase
    .from("tours_datastore")
    .select(
      `
      *,
      countries!tours_datastore_country_fkey(country_name),
      cities!tours_datastore_city_fkey(city_name)
    `,
      { count: "exact" }
    )
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    });

  if (country?.length > 0) query.in("country", country);
  if (city?.length > 0) query.in("city", city);
  if (tourName) query.ilike("tour_name", `%${tourName}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching tours: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export async function fetchTransfersDatastoreTableData(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const { sort, country, city, "transfer name": transferName } = params;

  const query = supabase
    .from("transfers_datastore")
    .select(
      `
      *,
      countries!transfers_datastore_country_fkey(country_name),
      cities!transfers_datastore_city_fkey(city_name)
    `,
      { count: "exact" }
    )
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    });

  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (city?.length > 0) query.ilikeAnyOf("city", city);
  if (transferName) query.ilike("transfer_name", `%${transferName}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching transfers: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export async function fetchCarOnDisposalsDatastoreTableData(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const { sort, country, "car on disposal": carOnDisposal } = params;

  const query = supabase
    .from("car_on_disposals_datastore")
    .select(
      `
      *,
      countries!meals_datastore_country_fkey(country_name)
    `,
      { count: "exact" }
    )
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    });

  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (carOnDisposal) query.ilike("name", `%${carOnDisposal}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching car on disposal: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export async function fetchMealsDatastoreTableData(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const { sort, country, "meal name": mealName } = params;

  const query = supabase
    .from("meals_datastore")
    .select(
      `
      *,
      countries!meals_datastore_country_fkey(country_name)
    `,
      { count: "exact" }
    )
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    });

  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (mealName) query.ilike("meal_name", `%${mealName}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching meals: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export async function fetchGuidesDatastoreTableData(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const { sort, country, guide_type, currency } = params;

  const query = supabase
    .from("guides_datastore")
    .select(
      `
      *,
      countries!guides_datastore_country_fkey(country_name)
    `,
      { count: "exact" }
    )
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    });

  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (guide_type?.length > 0) query.ilikeAnyOf("guide_type", guide_type);
  if (currency?.length > 0) query.ilikeAnyOf("currency", currency);
  const { data, error, count } = await query;

  if (error) {
    console.error(`Error fetching guides: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
      city_name: item.cities?.city_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export const copyhotelsDatastore = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("hotels_datastore").select("*").in("id", ids);

  if (error) return { error: error.message };

  const { error: insertError } = await supabase.from("hotels").upsert(
    data.map((item) => ({
      ...item,
      created_by: user.id,
      dmc_id: user.dmc.id,
    })),
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
};

export const copyToursDatastore = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("tours_datastore").select("*").in("id", ids);

  if (error) return { error: error.message };

  const { error: insertError } = await supabase.from("tours").upsert(
    data.map((item) => ({
      ...item,
      created_by: user.id,
      dmc_id: user.dmc.id,
    })),
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
};

export const copyTransfersDatastore = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("transfers_datastore").select("*").in("id", ids);

  if (error) return { error: error.message };

  const { error: insertError } = await supabase.from("transfers").insert(
    data.map((item) => ({
      ...item,
      created_by: user.id,
      dmc_id: user.dmc.id,
    }))
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
};

export const copyCarOnDisposalsDatastore = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("car_on_disposals_datastore").select("*").in("id", ids);

  if (error) return { error: error.message };

  const { error: insertError } = await supabase.from("car_on_disposals_datastore").insert(
    data.map((item) => ({
      ...item,
      created_by: user.id,
      dmc_id: user.dmc.id,
    }))
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
};

export const copyMealsDatastore = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("meals_datastore").select("*").in("id", ids);

  if (error) return { error: error.message };

  const { error: insertError } = await supabase.from("meals").insert(
    data.map((item) => ({
      ...item,
      created_by: user.id,
      dmc_id: user.dmc.id,
    }))
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
};

export const copyGuidesDatastore = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("guides_datastore").select("*").in("id", ids);

  if (error) return { error: error.message };

  const { error: insertError } = await supabase.from("guides").insert(
    data.map((item) => ({
      ...item,
      created_by: user.id,
      dmc_id: user.dmc.id,
    }))
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
};

// Fetch all countries (with optional search)
export async function fetchCountries(search: string = "") {
  const supabase = await createClient();
  let query = supabase
    .from("countries")
    .select("id, country_name, country_code")
    .order("country_name", { ascending: true });
  if (search) {
    query = query.ilike("country_name", `%${search}%`);
  }
  const { data, error } = await query;
  if (error) return [];
  return data.map((country) => ({
    label: country.country_name,
    value: country.id,
    code: country.country_code,
  }));
}

// Fetch all cities (with optional search)
export async function fetchCities(search: string = "") {
  const supabase = await createClient();
  let query = supabase.from("cities").select("id, city_name, city_code, country_code");
  if (search) {
    query = query.ilike("city_name", `%${search}%`);
  }
  const { data, error } = await query;
  if (error) return [];
  return data.map((city) => ({
    label: city.city_name,
    value: city.id,
    code: city.city_code,
    country_code: city.country_code,
  }));
}

// Fetch cities by country UUID (with optional search)
export async function fetchCitiesByCountryId(countryId: string, search: string = "") {
  const supabase = await createClient();
  let query = supabase
    .from("vw_cities_with_state_and_country")
    .select("id, city_name, city_code, state_code, country_code")
    .eq("country_id", countryId);
  if (search) {
    query = query.ilike("city_name", `${search}%`).limit(50);
  }
  const { data, error } = await query;
  if (error) return [];
  return data.map((city) => ({
    label: city.city_name,
    value: city.id,
    code: city.city_code,
    state_code: city.state_code,
    country_code: city.country_code,
  }));
}

export async function fetchCityById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cities")
    .select("id, city_name, city_code, country_code")
    .eq("id", id)
    .single();

  if (error) return null;

  return {
    label: data.city_name,
    value: data.id,
    code: data.city_code,
    country_code: data.country_code,
  };
}

// Fetch cities by country UUID (with optional search)
export async function fetchCitiesByStateId(stateId: string, search: string = "") {
  const supabase = await createClient();
  let query = supabase
    .from("vw_cities_with_state_and_country")
    .select("id, city_name, city_code, state_code, country_code")
    .eq("state_id", stateId);
  if (search) {
    query = query.ilike("city_name", `${search}%`);
  }
  const { data, error } = await query;
  if (error) return [];
  return data.map((city) => ({
    label: city.city_name,
    value: city.id,
    code: city.city_code,
    state_code: city.state_code,
    country_code: city.country_code,
  }));
}

// Fetch cities by country UUID (with optional search)
export async function fetchStatesByCountryId(countryId: string) {
  const supabase = await createClient();

  let query = supabase
    .from("vw_states_with_country")
    .select("id, state_name, state_code, country_code")
    .eq("country_id", countryId);

  const { data, error } = await query;
  if (error) return [];

  return data.map((state) => ({
    label: state.state_name,
    value: state.id,
    code: state.state_code,
    country_code: state.country_code,
  }));
}

export async function fetchDocDatastoreTableData(type: string) {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("docs_datastore")
    .select(
      `
      *,
      countries!docs_datastore_country_fkey(country_name)
    `,
      { count: "exact" }
    )
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (error) return { data: [], totalItems: 0 };

  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export const copyDocDatastore = async (ids: string[]) => {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };

  const { data, error } = await supabase.from("docs_datastore").select("*").in("id", ids);

  if (error) return { error: error.message };

  const { error: insertError } = await supabase.from("docs").insert(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data.map(({ id, ...item }) => ({
      ...item,
      created_at: new Date(),
      created_by: user.id,
      dmc_id: user.dmc.id,
    }))
  );

  if (insertError) return { error: insertError.message };

  return { success: true };
};
