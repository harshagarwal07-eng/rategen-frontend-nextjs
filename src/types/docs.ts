export interface Doc {
  id: number;
  created_at: string;
  created_by: string; // UUID
  dmc_id: string; // UUID
  is_active: boolean;
  content: string;
  type: string;
  country: string;
  state: string | null;
  nights?: number; // Only for itineraries
  country_name: string;
  service_type?: string; // tours, transfers, hotels, all
}

export interface DocFormData {
  is_active: boolean;
  content: string;
  country: string;
  nights?: number; // Only for itineraries
  service_type?: string; // tours, transfers, hotels, all
}

export interface CreateDocData {
  is_active: boolean;
  content: string;
  type: string;
  country: string;
  nights?: number; // Only for itineraries
  service_type?: string; // tours, transfers, hotels, all
}

export type EditDocFormData = {
  is_active?: boolean;
  country?: string;
  state?: string | null; // Only for itineraries
  nights?: number; // Only for itineraries
  service_type?: string; // tours, transfers, hotels, all
};

export type UpdateDocContent = {
  content: string;
};

// ============================================
// Library Types
// ============================================

export type LibraryItemStatus = "active" | "inactive" | "blacklist";
export type LibraryType = "vehicles" | "drivers" | "restaurants" | "guides";
export type OwnerType = "company" | "supplier" | "custom";
export type PayrollType = "company" | "supplier" | "independent";

// Vehicles Library
export interface IVehicle {
  id: string;
  created_at: string;
  updated_at: string;
  dmc_id: string;
  status: LibraryItemStatus;
  brand?: string;
  category?: string;
  yr_of_reg?: number;
  v_type?: string;
  v_number: string;
  owned_by_type?: string;
  supplier_id?: string | null;
  owned_by_notes?: string;
  country?: string;
  state?: string;
  city?: string;
  // Populated from joins
  supplier_name?: string;
  country_name?: string;
  state_name?: string;
  city_name?: string;
  images?: string[];
}

// Drivers Library
export interface IDriver {
  id: string;
  created_at: string;
  updated_at: string;
  dmc_id: string;
  status: LibraryItemStatus;
  name: string;
  gender: string;
  phone: string;
  whatsapp_number?: string;
  languages_known: string[];
  payroll_type: PayrollType;
  supplier_id?: string | null;
  country?: string;
  state?: string;
  city?: string;
  // Populated from joins
  supplier_name?: string;
  country_name?: string;
  state_name?: string;
  city_name?: string;
  images: string[];
}

// Restaurants Library
export interface IRestaurant {
  id: string;
  created_at: string;
  updated_at: string;
  dmc_id: string;
  status: LibraryItemStatus;
  name: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  landline_number?: string;
  phone?: string;
  poc_name?: string;
  // Populated from joins
  country_name?: string;
  state_name?: string;
  city_name?: string;
}

// Guides Library
export interface IGuide {
  id: string;
  created_at: string;
  updated_at: string;
  dmc_id: string;
  status: LibraryItemStatus;
  name: string;
  gender: string;
  phone: string;
  whatsapp_number?: string;
  languages_known: string[];
  payroll_type: PayrollType;
  supplier_id?: string | null;
  country?: string;
  state?: string;
  city?: string;
  // Populated from joins
  supplier_name?: string;
  country_name?: string;
  state_name?: string;
  city_name?: string;
  images: string[];
}
