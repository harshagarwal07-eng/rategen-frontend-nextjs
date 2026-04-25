"use client";

import { http } from "@/lib/api";
import { DmcHotel, DmcHotelListResponse } from "@/types/hotels";

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: unknown): Result<T> {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in (raw as Record<string, unknown>)) {
    const err = (raw as { error?: unknown }).error;
    if (err) return { data: null, error: String(err) };
  }
  return { data: raw as T, error: null };
}

export type HotelSortKey = "created_at" | "name" | "star_rating" | "is_preferred" | "status";

export type ListHotelsParams = {
  page?: number;
  perPage?: number;
  name?: string;
  country_id?: string;
  city_id?: string;
  status?: "active" | "inactive";
  is_preferred?: boolean;
  sort?: HotelSortKey;
  sortDir?: "asc" | "desc";
};

export async function listHotels(params: ListHotelsParams = {}): Promise<Result<DmcHotelListResponse>> {
  const raw = await http.get<DmcHotelListResponse>("/api/hotels", params);
  return unwrap<DmcHotelListResponse>(raw);
}

export async function getHotel(id: string): Promise<Result<DmcHotel>> {
  const raw = await http.get<DmcHotel>(`/api/hotels/${id}`);
  return unwrap<DmcHotel>(raw);
}

export type CreateHotelPayload = {
  name: string;
  currency: string;
  hotel_code?: string;
  property_type?: string;
  country_id?: string;
  city_id?: string;
  star_rating?: number;
  is_preferred?: boolean;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
  status?: "active" | "inactive";
};

export async function createHotel(data: CreateHotelPayload): Promise<Result<DmcHotel>> {
  const raw = await http.post<DmcHotel>("/api/hotels", data);
  return unwrap<DmcHotel>(raw);
}

export async function updateHotel(id: string, data: Partial<CreateHotelPayload>): Promise<Result<DmcHotel>> {
  const raw = await http.patch<DmcHotel>(`/api/hotels/${id}`, data);
  return unwrap<DmcHotel>(raw);
}

export async function deleteHotel(id: string): Promise<Result<void>> {
  const raw = await http.delete<void>(`/api/hotels/${id}`);
  return unwrap<void>(raw);
}
