import { fetchCountries, fetchCities } from "@/data-access/datastore";

// Helper to build a map of UUIDs to names for only the required UUIDs
export async function buildCountryMap(
  uuids: string[]
): Promise<Record<string, string>> {
  if (!uuids.length) return {};
  const countries = await fetchCountries();
  const map: Record<string, string> = {};
  for (const c of countries) {
    if (uuids.includes(c.value)) map[c.value] = c.label;
  }
  return map;
}

export async function buildCityMap(
  uuids: string[]
): Promise<Record<string, string>> {
  if (!uuids.length) return {};
  const cities = await fetchCities();
  const map: Record<string, string> = {};
  for (const c of cities) {
    if (uuids.includes(c.value)) map[c.value] = c.label;
  }
  return map;
}

// For async country search in filter
export async function fetchCountriesBySearch(query: string) {
  const countries = await fetchCountries(query);
  return countries;
}

// For async city search in filter
export async function fetchCitiesBySearch(query: string) {
  const cities = await fetchCities(query);
  return cities;
}

// Helper to extract unique UUIDs from table data
export function extractCountryUuids<T extends { country?: string }>(
  tableData: T[]
): string[] {
  return Array.from(
    new Set(
      tableData
        .map((row) => row.country)
        .filter((country): country is string => Boolean(country))
    )
  );
}

export function extractCityUuids<T extends { city?: string }>(
  tableData: T[]
): string[] {
  return Array.from(
    new Set(
      tableData
        .map((row) => row.city)
        .filter((city): city is string => Boolean(city))
    )
  );
}
