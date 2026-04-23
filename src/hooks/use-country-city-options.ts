"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCountries,
  fetchCitiesByCountryId,
  fetchStatesByCountryId,
  fetchCitiesByStateId,
} from "@/data-access/datastore";

interface IOption {
  value: string;
  label: string;
  code?: string;
  country_code?: string;
}

/**
 * Hook to fetch and cache country options using React Query
 * Countries are cached for 30 minutes since they rarely change
 */
export function useCountryOptions() {
  return useQuery<IOption[]>({
    queryKey: ["countries"],
    queryFn: () => fetchCountries(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
  });
}

/**
 * Hook to fetch and cache state options by country using React Query
 * States are cached per country for 30 minutes
 */
export function useStateOptions(countryId: string | undefined) {
  return useQuery<IOption[]>({
    queryKey: ["states", countryId],
    queryFn: () => (countryId ? fetchStatesByCountryId(countryId) : Promise.resolve([])),
    enabled: !!countryId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch and cache city options by country using React Query
 * Cities are cached per country for 30 minutes
 */
export function useCityOptions({ countryId, stateId }: { countryId?: string; stateId?: string }) {
  return useQuery<IOption[]>({
    queryKey: ["cities", countryId, stateId],
    queryFn: () =>
      stateId ? fetchCitiesByStateId(stateId) : countryId ? fetchCitiesByCountryId(countryId) : Promise.resolve([]),
    enabled: !!countryId || !!stateId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Combined hook for both country and city options
 * Use this when you need both in a form
 */
export function useCountryCityOptions({ countryId, stateId }: { countryId?: string; stateId?: string }) {
  const countriesQuery = useCountryOptions();
  const statesQuery = useStateOptions(countryId);
  const citiesQuery = useCityOptions({ countryId, stateId });

  return {
    countries: countriesQuery.data || [],
    states: statesQuery.data || [],
    cities: citiesQuery.data || [],
    isLoadingCountries: countriesQuery.isLoading,
    isLoadingStates: statesQuery.isLoading,
    isLoadingCities: citiesQuery.isLoading,
    isLoading: countriesQuery.isLoading || statesQuery.isLoading || citiesQuery.isLoading,
  };
}
