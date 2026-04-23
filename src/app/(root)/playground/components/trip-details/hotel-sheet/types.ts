import type { HotelActivity, RoomSelection, RoomPaxDistribution } from "@/data-access/itinerary-activities";
import type { HotelRoomDetails } from "@/data-access/service-details";
import type { ServiceBreakup } from "@/data-access/service-breakups";

export interface HotelFormData extends Partial<HotelActivity> {
  // Aggregated from multiple activities
  allActivityIds?: string[];
}

export interface AvailableRoom {
  id: string;
  room_category: string;
  meal_plan?: string;
  max_occupancy?: string;
}

export interface ItineraryInfo {
  nights: number;
  checkIn: string; // YYYY-MM-DD
}

export interface HotelSheetContextValue {
  formData: HotelFormData;
  hotelDetails: HotelRoomDetails | null;
  availableRooms: AvailableRoom[];
  breakups: ServiceBreakup[];
  saving: boolean;
  hasChanges: boolean;
  itineraryInfo: ItineraryInfo | null;
  updateFormField: <K extends keyof HotelActivity>(field: K, value: HotelActivity[K]) => void;
  updateBreakupField: (id: string, field: string, value: any) => void;
  addBreakup: () => Promise<void>;
  deleteBreakup: (id: string) => Promise<void>;
  handleSave: () => Promise<void>;
  handleSaveBreakups: () => Promise<void>;
}
