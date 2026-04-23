/**
 * Meal Types Constants
 * Single source of truth for all meal plan types used across the application
 */

export const MEAL_TYPES = [
  { value: "Room Only", label: "Room Only", short: "RO" },
  { value: "Breakfast", label: "Bed & Breakfast", short: "BB" },
  { value: "Half Board", label: "Half Board", short: "HB" },
  { value: "Full Board", label: "Full Board", short: "FB" },
  { value: "All Inclusive", label: "All Inclusive", short: "AI" },
  { value: "Christmas Gala Dinner", label: "Christmas Gala Dinner", short: "CGD" },
  { value: "New Year Gala Dinner", label: "New Year Gala Dinner", short: "NYGD" },
] as const;

export const MEAL_TYPES_ENUM = MEAL_TYPES.map((m) => m.value) as [string, ...string[]];

export type MealType = (typeof MEAL_TYPES)[number]["value"];

export const DEFAULT_MEAL_PLAN = "BB";
