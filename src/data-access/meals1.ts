"use client";

import http from "@/lib/api";
import {
  MealProduct,
  MealPackage,
  MealAgePolicies,
  MealPricing,
  MealCancellationPolicy,
  MealCuisine,
} from "@/types/meals1";

type Result<T> = { data: T | null; error: string | null };

function unwrap<T>(raw: any): Result<T> {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.error) {
    return { data: null, error: raw.error };
  }
  return { data: raw as T, error: null };
}

export async function listMeals(): Promise<Result<MealProduct[]>> {
  const raw = await (http.get("/api/meals") as any);
  return unwrap<MealProduct[]>(raw);
}

export async function getMealById(id: string): Promise<Result<MealProduct>> {
  const raw = await (http.get(`/api/meals/${id}`) as any);
  return unwrap<MealProduct>(raw);
}

export async function createMeal(
  data: Pick<MealProduct, "name" | "currency" | "country_id" | "geo_id">
): Promise<Result<MealProduct>> {
  const raw = await (http.post("/api/meals", data) as any);
  return unwrap<MealProduct>(raw);
}

export async function updateMeal(
  id: string,
  data: Partial<Pick<MealProduct, "name" | "currency" | "country_id" | "geo_id">>
): Promise<Result<MealProduct>> {
  const raw = await (http.put(`/api/meals/${id}`, data) as any);
  return unwrap<MealProduct>(raw);
}

export async function deleteMeal1(id: string): Promise<Result<{ deleted: boolean }>> {
  const raw = await (http.delete(`/api/meals/${id}`) as any);
  return unwrap<{ deleted: boolean }>(raw);
}

export async function listCuisines(): Promise<Result<MealCuisine[]>> {
  const raw = await (http.get("/api/meals/master/cuisines") as any);
  return unwrap<MealCuisine[]>(raw);
}

export async function createPackage(
  mealId: string,
  data: Omit<MealPackage, "id" | "meal_product_id" | "created_at" | "updated_at" | "cuisine" | "meal_age_policies" | "meal_pricing" | "meal_cancellation_policies">
): Promise<Result<MealPackage>> {
  const raw = await (http.post(`/api/meals/${mealId}/packages`, data) as any);
  return unwrap<MealPackage>(raw);
}

export async function updatePackage(
  mealId: string,
  packageId: string,
  data: Partial<Omit<MealPackage, "id" | "meal_product_id" | "created_at" | "updated_at" | "cuisine" | "meal_age_policies" | "meal_pricing" | "meal_cancellation_policies">>
): Promise<Result<MealPackage>> {
  const raw = await (http.put(`/api/meals/${mealId}/packages/${packageId}`, data) as any);
  return unwrap<MealPackage>(raw);
}

export async function deletePackage(
  mealId: string,
  packageId: string
): Promise<Result<{ deleted: boolean }>> {
  const raw = await (http.delete(`/api/meals/${mealId}/packages/${packageId}`) as any);
  return unwrap<{ deleted: boolean }>(raw);
}

export async function replaceAgePolicies(
  mealId: string,
  packageId: string,
  policies: MealAgePolicies[]
): Promise<Result<MealAgePolicies[]>> {
  const raw = await (http.post(`/api/meals/${mealId}/packages/${packageId}/age-policies`, policies) as any);
  return unwrap<MealAgePolicies[]>(raw);
}

export async function replacePricing(
  mealId: string,
  packageId: string,
  pricing: MealPricing[]
): Promise<Result<MealPricing[]>> {
  const raw = await (http.post(`/api/meals/${mealId}/packages/${packageId}/pricing`, pricing) as any);
  return unwrap<MealPricing[]>(raw);
}

export async function replaceCancellationPolicies(
  mealId: string,
  packageId: string,
  policies: MealCancellationPolicy[]
): Promise<Result<MealCancellationPolicy[]>> {
  const raw = await (http.post(`/api/meals/${mealId}/packages/${packageId}/cancellation-policies`, policies) as any);
  return unwrap<MealCancellationPolicy[]>(raw);
}
