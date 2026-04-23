"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Car,
  UtensilsCrossed,
  Search,
  Plus,
  Check,
  Loader2,
  LucideFerrisWheel,
  Plane,
  ChevronLeft,
  BedDouble,
  Users,
  Clock,
  PenLine,
} from "lucide-react";
import ManualHotelSheet, { type ManualHotelData } from "./manual-hotel-sheet";
import ManualTourSheet, { type ManualTourData } from "./manual-tour-sheet";
import ManualTransferSheet, { type ManualTransferData } from "./manual-transfer-sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getHotelsForPicker } from "@/data-access/hotels";
import { getAllMealsByUser } from "@/data-access/meals";
import { getAllGuidesByUser } from "@/data-access/guides";
import { searchTourPackages } from "@/data-access/tours";
import { searchTransferPackages } from "@/data-access/transfers";
import { searchLibraryItems, type LibraryItem } from "@/data-access/itinerary-library";
import debounce from "lodash/debounce";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TbTrekking } from "react-icons/tb";
import { Separator } from "@/components/ui/separator";

interface AddActivityPopoverProps {
  trigger: React.ReactNode;
  onAddActivity: (activity: any) => Promise<any> | void;
  dayIndex: number;
  isPanelExpanded?: boolean;
  // Itinerary info for hotel nights constraint
  itineraryNights?: number;
  itineraryCheckIn?: string;
  // Travelers for room pax distribution
  travelers?: {
    adults: number;
    teens?: number;
    children: number;
    infants?: number;
    children_ages?: number[];
  };
}

type ServiceType = "hotel" | "tour" | "transfer" | "meal" | "guide" | "flight";
type ItemSource = "dmc" | "library";

interface ServiceItem {
  id: string;
  name: string;
  packageName?: string;
  description?: string;
  location?: string;
  category: ServiceType;
  parentId?: string;
  data: any;
  // Additional fields for better display
  mode?: string;
  route?: string;
  types?: string[];
  preferred?: boolean;
  duration?: { days?: number; hours?: number; minutes?: number } | null;
  images?: string[];
  // Hotel specific
  rooms?: RoomItem[];
  // Source tracking for hotels/tours/transfers
  source?: ItemSource;
  libraryItemId?: string;
}

interface RoomItem {
  id: string;
  room_category: string;
  meal_plan?: string;
  max_occupancy?: string;
  other_details?: string;
}

const SERVICE_TYPES: { id: ServiceType; label: string; icon: React.ElementType }[] = [
  { id: "hotel", label: "Hotels", icon: Building2 },
  { id: "tour", label: "Tours", icon: LucideFerrisWheel },
  { id: "transfer", label: "Transfers", icon: Car },
  { id: "meal", label: "Meals", icon: UtensilsCrossed },
  { id: "guide", label: "Guides", icon: TbTrekking },
  { id: "flight", label: "Flights", icon: Plane },
];

export default function AddActivityPopover({
  trigger,
  onAddActivity,
  dayIndex,
  isPanelExpanded = false,
  itineraryNights,
  itineraryCheckIn,
  travelers,
}: AddActivityPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<ServiceType>("hotel");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  // Multi-select for tours/transfers
  const [selectedItems, setSelectedItems] = useState<ServiceItem[]>([]);
  // Hotel room selection state
  const [selectedHotel, setSelectedHotel] = useState<ServiceItem | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  // Number of nights for hotel
  const [hotelNights, setHotelNights] = useState(1);
  // Manual form states
  const [showManualHotelForm, setShowManualHotelForm] = useState(false);
  const [showManualTourForm, setShowManualTourForm] = useState(false);
  const [showManualTransferForm, setShowManualTransferForm] = useState(false);
  // Source tab (DMC vs Library) - shared for hotel/tour/transfer
  const [itemSource, setItemSource] = useState<ItemSource>("dmc");

  // Calculate max nights available from current day
  const maxNightsFromDay = itineraryNights ? Math.max(1, itineraryNights - dayIndex) : 30;

  const loadItems = useCallback(async (type: ServiceType, query: string, source: ItemSource = "dmc") => {
    setLoading(true);
    setItems([]);

    try {
      let results: ServiceItem[] = [];
      const params = { perPage: 20, page: 1 };

      switch (type) {
        case "hotel": {
          if (source === "library") {
            // Fetch from library
            const { data } = await searchLibraryItems({
              service_type: "hotel",
              query: query || undefined,
              limit: 20,
            });
            results = (data || []).map((item: LibraryItem) => ({
              id: item.id,
              name: item.name,
              description: item.data?.property_type
                ? `${item.data.property_type}${item.data?.star_rating ? ` - ${item.data.star_rating}` : ""}`
                : undefined,
              // View returns resolved city/country names
              location: [item.city, item.country].filter(Boolean).join(", "),
              category: "hotel" as ServiceType,
              preferred: false,
              images: item.images || [],
              rooms: (item.data?.rooms || []).map((room: any, idx: number) => ({
                id: `library-room-${item.id}-${idx}`,
                room_category: room.room_category,
                meal_plan: room.meal_plan,
                max_occupancy: room.max_occupancy,
                other_details: room.other_details,
              })),
              data: {
                ...item.data,
                hotel_name: item.name,
                hotel_city: item.city,
                hotel_country: item.country,
                hotel_address: item.address,
                hotel_phone: item.phone,
                hotel_email: item.email,
                images: item.images,
                currency: item.currency,
              },
              source: "library" as ItemSource,
              libraryItemId: item.id,
            }));
          } else {
            // Fetch from DMC hotels
            const { data } = await getHotelsForPicker({ perPage: 20, hotel_name: query || undefined });
            results = (data || []).map((item: any) => ({
              id: item.id,
              name: item.hotel_name,
              description: item.property_type
                ? `${item.property_type}${item.star_rating ? ` - ${item.star_rating}` : ""}`
                : undefined,
              location: `${item.city_name || ""}, ${item.country_name || ""}`.replace(/^,\s*|,\s*$/g, ""),
              category: "hotel" as ServiceType,
              preferred: item.preferred,
              rooms: (item.rooms || []).map((room: any) => ({
                id: room.id,
                room_category: room.room_category,
                meal_plan: room.meal_plan,
                max_occupancy: room.max_occupancy,
                other_details: room.other_details,
              })),
              data: item,
              source: "dmc" as ItemSource,
            }));
          }
          break;
        }
        case "tour": {
          if (source === "library") {
            // Fetch from library
            const { data } = await searchLibraryItems({
              service_type: "tour",
              query: query || undefined,
              limit: 20,
            });
            results = (data || []).map((item: LibraryItem) => ({
              id: item.id,
              name: item.name,
              packageName: item.data?.package_name,
              description: item.data?.package_description,
              location: [item.city, item.country].filter(Boolean).join(", "),
              category: "tour" as ServiceType,
              preferred: false,
              duration: item.data?.duration,
              images: item.images || [],
              data: {
                ...item.data,
                tour_name: item.name,
                tour_city: item.city,
                tour_country: item.country,
                images: item.images,
                currency: item.currency,
              },
              source: "library" as ItemSource,
              libraryItemId: item.id,
            }));
          } else {
            // Fetch from DMC tours
            const { data } = await searchTourPackages({ query: query || undefined, limit: 20 });
            results = (data || []).map((item: any) => ({
              id: item.id,
              parentId: item.tour_id,
              name: item.tour_name,
              packageName: item.package_name,
              description: item.package_description,
              location: [item.city, item.country].filter(Boolean).join(", "),
              category: "tour" as ServiceType,
              preferred: item.package_preferred,
              duration: item.duration,
              data: item,
              source: "dmc" as ItemSource,
            }));
          }
          break;
        }
        case "transfer": {
          if (source === "library") {
            // Fetch from library
            const { data } = await searchLibraryItems({
              service_type: "transfer",
              query: query || undefined,
              limit: 20,
            });
            results = (data || []).map((item: LibraryItem) => ({
              id: item.id,
              name: item.name,
              packageName: item.data?.package_name,
              description: item.data?.package_description,
              location: [item.city, item.country].filter(Boolean).join(", "),
              category: "transfer" as ServiceType,
              mode: item.data?.transfer_mode,
              route:
                item.data?.pickup_point && item.data?.drop_point
                  ? `${item.data.pickup_point} → ${item.data.drop_point}`
                  : undefined,
              preferred: false,
              duration: item.data?.duration_hours
                ? { hours: item.data.duration_hours }
                : item.data?.duration_days
                  ? { days: item.data.duration_days }
                  : undefined,
              images: item.images || [],
              data: {
                ...item.data,
                transfer_name: item.name,
                transfer_city: item.city,
                transfer_country: item.country,
                images: item.images,
                currency: item.currency,
              },
              source: "library" as ItemSource,
              libraryItemId: item.id,
            }));
          } else {
            // Fetch from DMC transfers
            const { data } = await searchTransferPackages({ query: query || undefined, limit: 20 });
            results = (data || []).map((item: any) => ({
              id: item.id,
              parentId: item.transfer_id,
              name: item.transfer_name,
              packageName: item.package_name,
              description: item.package_description,
              location: [item.city, item.country].filter(Boolean).join(", "),
              category: "transfer" as ServiceType,
              mode: item.mode,
              route: item.route,
              preferred: item.package_preferred,
              duration: item.duration,
              data: item,
              source: "dmc" as ItemSource,
            }));
          }
          break;
        }
        case "meal": {
          const { data } = await getAllMealsByUser({ ...params, meal_name: query || undefined });
          results = (data || []).map((item: any) => ({
            id: item.id,
            name: item.meal_name || item.name,
            description: item.meal_type,
            location: `${item.city_name || ""}, ${item.country_name || ""}`.replace(/^,\s*|,\s*$/g, ""),
            category: "meal" as ServiceType,
            data: item,
          }));
          break;
        }
        case "guide": {
          const { data } = await getAllGuidesByUser({ ...params, guide_name: query || undefined });
          results = (data || []).map((item: any) => ({
            id: item.id,
            name: item.guide_name || item.name,
            description: item.language || item.specialization,
            location: `${item.city_name || ""}, ${item.country_name || ""}`.replace(/^,\s*|,\s*$/g, ""),
            category: "guide" as ServiceType,
            data: item,
          }));
          break;
        }
        case "flight": {
          results = [];
          break;
        }
      }

      setItems(results);
    } catch (error) {
      console.error("[AddActivityPopover] Error loading items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const activeTypeRef = useRef(activeType);
  activeTypeRef.current = activeType;
  const itemSourceRef = useRef(itemSource);
  itemSourceRef.current = itemSource;

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      loadItems(activeTypeRef.current, query, itemSourceRef.current);
    }, 300),
    [loadItems]
  );

  useEffect(() => {
    if (open) {
      loadItems(activeType, searchQuery, itemSource);
    }
  }, [activeType, open, itemSource]);

  useEffect(() => {
    if (!open && !showManualHotelForm && !showManualTourForm && !showManualTransferForm) {
      // Only reset when popover and all sheets are closed
      setSearchQuery("");
      setSelectedItem(null);
      setSelectedItems([]);
      setActiveType("hotel");
      setSelectedHotel(null);
      setSelectedRoom(null);
      setHotelNights(1);
      setIsAdding(false);
      setItemSource("dmc");
    }
  }, [open, showManualHotelForm, showManualTourForm, showManualTransferForm]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleTypeChange = (type: ServiceType) => {
    setActiveType(type);
    setSearchQuery("");
    setSelectedItem(null);
    setSelectedItems([]);
    setSelectedHotel(null);
    setSelectedRoom(null);
    setShowManualHotelForm(false);
    setShowManualTourForm(false);
    setShowManualTransferForm(false);
    setItemSource("dmc");
  };

  const handleItemSourceChange = (source: ItemSource) => {
    setItemSource(source);
    setSearchQuery("");
    setSelectedItem(null);
    setSelectedItems([]);
    setSelectedHotel(null);
    setSelectedRoom(null);
  };

  const handleSelectItem = (item: ServiceItem) => {
    // For hotels, go to room selection
    if (item.category === "hotel") {
      setSelectedHotel(item);
      setSelectedRoom(null);
    } else if (item.category === "tour" || item.category === "transfer") {
      // Multi-select: toggle in selectedItems
      setSelectedItems((prev) => {
        const exists = prev.find((s) => s.id === item.id);
        if (exists) return prev.filter((s) => s.id !== item.id);
        return [...prev, item];
      });
    } else {
      setSelectedItem(item);
    }
  };

  const handleSelectRoom = (room: RoomItem) => {
    setSelectedRoom(room);
  };

  const handleBackToHotels = () => {
    setSelectedHotel(null);
    setSelectedRoom(null);
    setShowManualHotelForm(false);
  };

  // Handle manual hotel save - create activity and add to itinerary
  const handleSaveManualHotel = async (hotelData: ManualHotelData) => {
    // Create activity from manual hotel data
    const activity: any = {
      activity_id: crypto.randomUUID(),
      package_type: "hotel",
      title: hotelData.hotel_name,
      activity: hotelData.hotel_name,
      status: "included",
      // Mark as manual hotel
      hotel_id: null,
      room_id: null,
      library_item_id: hotelData.library_item_id,
      // Hotel info
      hotel_name: hotelData.hotel_name,
      hotel_city: hotelData.hotel_city,
      hotel_country: hotelData.hotel_country,
      hotel_address: hotelData.hotel_address,
      hotel_phone: hotelData.hotel_phone,
      hotel_email: hotelData.hotel_email,
      hotel_star_rating: hotelData.hotel_star_rating,
      hotel_property_type: hotelData.hotel_property_type,
      // Rooms
      rooms: hotelData.rooms?.map((r) => ({ room_category: r.room_category, quantity: 1 })) || [],
      room_category: hotelData.rooms?.[0]?.room_category,
      meal_plan: hotelData.rooms?.[0]?.meal_plan,
      // Images
      images: hotelData.images || [],
      // Policies
      offers: hotelData.offers,
      remarks: hotelData.remarks,
      cancellation_policy: hotelData.cancellation_policy,
      payment_policy: hotelData.payment_policy,
      group_policy: hotelData.group_policy,
      age_policy: hotelData.age_policy,
      meal_plan_rates: hotelData.meal_plan_rates,
      currency: hotelData.currency,
      // Start on current day
      start_day: dayIndex + 1,
      nights: 1,
      // Flag to auto-open hotel sheet
      autoOpenSheet: true,
    };

    await onAddActivity(activity);
    setOpen(false);
    setShowManualHotelForm(false);
    setSearchQuery("");
  };

  // Handle manual tour save - create activity and add to itinerary
  const handleSaveManualTour = async (tourData: ManualTourData) => {
    const activity: any = {
      activity_id: crypto.randomUUID(),
      package_type: "tour",
      title: tourData.tour_name,
      activity: tourData.tour_name,
      status: "included",
      // Mark as manual tour
      tour_package_id: null,
      tour_id: null,
      library_item_id: tourData.library_item_id,
      is_manual: true,
      // Tour info
      tour_name: tourData.tour_name,
      tour_city: tourData.tour_city,
      tour_country: tourData.tour_country,
      package_name: tourData.package_name,
      package_description: tourData.package_description,
      categories: tourData.categories,
      duration: tourData.duration,
      tour_type: tourData.tour_type,
      includes_transfer: tourData.includes_transfer,
      meeting_point: tourData.meeting_point,
      pickup_point: tourData.pickup_point,
      dropoff_point: tourData.dropoff_point,
      // Images
      images: tourData.images || [],
      // Policies
      inclusions: tourData.inclusions,
      exclusions: tourData.exclusions,
      cancellation_policy: tourData.cancellation_policy,
      agency_cancellation_policy: tourData.agency_cancellation_policy,
      age_policy: tourData.age_policy,
      add_ons: tourData.add_ons,
      seasons: tourData.seasons,
      currency: tourData.currency,
      notes: tourData.notes,
      // Start on current day
      day_number: dayIndex + 1,
      // Flag to auto-open tour sheet
      autoOpenSheet: true,
    };

    await onAddActivity(activity);
    setOpen(false);
    setShowManualTourForm(false);
    setSearchQuery("");
  };

  // Handle manual transfer save - create activity and add to itinerary
  const handleSaveManualTransfer = async (transferData: ManualTransferData) => {
    const activity: any = {
      activity_id: crypto.randomUUID(),
      package_type: "transfer",
      title: transferData.transfer_name,
      activity: transferData.transfer_name,
      status: "included",
      // Mark as manual transfer
      transfer_package_id: null,
      transfer_id: null,
      library_item_id: transferData.library_item_id,
      is_manual: true,
      // Transfer info
      transfer_name: transferData.transfer_name,
      transfer_city: transferData.transfer_city,
      transfer_country: transferData.transfer_country,
      package_name: transferData.package_name,
      package_description: transferData.package_description,
      transfer_mode: transferData.transfer_mode,
      transfer_type: transferData.transfer_type,
      is_sic: transferData.is_sic,
      pickup_date: transferData.pickup_date,
      pickup_time: transferData.pickup_time,
      pickup_point: transferData.pickup_point,
      drop_date: transferData.drop_date,
      drop_time: transferData.drop_time,
      drop_point: transferData.drop_point,
      meeting_point: transferData.meeting_point,
      duration_hours: transferData.duration_hours,
      duration_days: transferData.duration_days,
      distance_km: transferData.distance_km,
      // Images
      images: transferData.images || [],
      // Policies
      inclusions: transferData.inclusions,
      exclusions: transferData.exclusions,
      cancellation_policy: transferData.cancellation_policy,
      agency_cancellation_policy: transferData.agency_cancellation_policy,
      age_policy: transferData.age_policy,
      add_ons: transferData.add_ons,
      seasons: transferData.seasons,
      currency: transferData.currency,
      notes: transferData.notes,
      // Start on current day
      day_number: dayIndex + 1,
      // Flag to auto-open transfer sheet
      autoOpenSheet: true,
    };

    await onAddActivity(activity);
    setOpen(false);
    setShowManualTransferForm(false);
    setSearchQuery("");
  };

  const handleAddActivity = async () => {
    // For hotels, we need both hotel and room selected
    if (activeType === "hotel") {
      if (!selectedHotel || !selectedRoom) return;

      setIsAdding(true);
      try {
        // Calculate check-in and check-out dates
        let checkInDate: string | undefined;
        let checkOutDate: string | undefined;
        if (itineraryCheckIn) {
          const checkIn = new Date(itineraryCheckIn);
          checkIn.setDate(checkIn.getDate() + dayIndex); // dayIndex is 0-based
          checkInDate = checkIn.toISOString().split("T")[0];

          const checkOut = new Date(checkIn);
          checkOut.setDate(checkOut.getDate() + hotelNights);
          checkOutDate = checkOut.toISOString().split("T")[0];
        }

        // Create room_pax_distribution with all guests in room 1
        const roomPaxDistribution = [
          {
            room_number: 1,
            adults: travelers?.adults || 2,
            teens: travelers?.teens || 0,
            children: travelers?.children || 0,
            infants: travelers?.infants || 0,
            children_ages: travelers?.children_ages || [],
          },
        ];

        // Build activity based on source (DMC vs Library)
        const isLibraryHotel = selectedHotel.source === "library";

        const activity: any = {
          activity_id: crypto.randomUUID(),
          package_type: "hotel",
          title: `${hotelNights}N at ${selectedHotel.name} - ${selectedRoom.room_category}`,
          activity: selectedHotel.name,
          status: "included",
          // IDs based on source
          hotel_id: isLibraryHotel ? null : selectedHotel.id,
          room_id: isLibraryHotel ? null : selectedRoom.id,
          library_item_id: isLibraryHotel ? selectedHotel.libraryItemId : undefined,
          // Flag as manual for library hotels (triggers correct save path)
          is_manual: isLibraryHotel,
          // Hotel info
          hotel_name: selectedHotel.name,
          hotel_city: selectedHotel.data?.city_name || selectedHotel.data?.hotel_city,
          hotel_country: selectedHotel.data?.country_name || selectedHotel.data?.hotel_country,
          hotel_address: selectedHotel.data?.hotel_address,
          hotel_phone: selectedHotel.data?.hotel_phone,
          hotel_email: selectedHotel.data?.hotel_email,
          hotel_star_rating: selectedHotel.data?.star_rating,
          hotel_property_type: selectedHotel.data?.property_type,
          // Room info
          room_category: selectedRoom.room_category,
          meal_plan: selectedRoom.meal_plan,
          max_occupancy: selectedRoom.max_occupancy,
          // Hotel specific fields
          nights: hotelNights,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          start_day: dayIndex + 1, // 1-based day number
          rooms: [{ room_category: selectedRoom.room_category, quantity: 1 }],
          room_pax_distribution: roomPaxDistribution,
          // Images from hotel (if available)
          images: selectedHotel.images || selectedHotel.data?.images || [],
          // Include policies for library hotels
          ...(isLibraryHotel && {
            cancellation_policy: selectedHotel.data?.cancellation_policy,
            payment_policy: selectedHotel.data?.payment_policy,
            group_policy: selectedHotel.data?.group_policy,
            age_policy: selectedHotel.data?.age_policy,
            meal_plan_rates: selectedHotel.data?.meal_plan_rates,
            currency: selectedHotel.data?.currency,
            offers: selectedHotel.data?.offers,
          }),
          // Flag to auto-open hotel sheet
          autoOpenSheet: true,
        };

        await onAddActivity(activity);
        setOpen(false);
        setSelectedHotel(null);
        setSelectedRoom(null);
        setHotelNights(1);
        setSearchQuery("");
      } finally {
        setIsAdding(false);
      }
      return;
    }

    // Multi-select path for tours/transfers
    if ((activeType === "tour" || activeType === "transfer") && selectedItems.length > 0) {
      setIsAdding(true);
      try {
        for (const item of selectedItems) {
          const activity: any = {
            activity_id: crypto.randomUUID(),
            package_type: item.category,
            title: item.packageName ? `${item.name} - ${item.packageName}` : item.name,
            activity: item.name,
            status: "included",
          };

          if (item.category === "tour") {
            const isLibraryTour = item.source === "library";
            activity.tour_package_id = isLibraryTour ? null : item.id;
            activity.tour_id = isLibraryTour ? null : item.parentId;
            activity.library_item_id = isLibraryTour ? item.libraryItemId : undefined;
            activity.is_manual = isLibraryTour;
            activity.tour_name = item.name;
            activity.tour_city = item.data?.tour_city || item.data?.city;
            activity.tour_country = item.data?.tour_country || item.data?.country;
            activity.package_name = item.packageName;
            activity.package_description = item.data?.package_description;
            activity.images = item.images || item.data?.images || [];
            if (isLibraryTour) {
              activity.categories = item.data?.categories;
              activity.duration = item.data?.duration;
              activity.tour_type = item.data?.tour_type;
              activity.includes_transfer = item.data?.includes_transfer;
              activity.meeting_point = item.data?.meeting_point;
              activity.pickup_point = item.data?.pickup_point;
              activity.dropoff_point = item.data?.dropoff_point;
              activity.inclusions = item.data?.inclusions;
              activity.exclusions = item.data?.exclusions;
              activity.cancellation_policy = item.data?.cancellation_policy;
              activity.agency_cancellation_policy = item.data?.agency_cancellation_policy;
              activity.age_policy = item.data?.age_policy;
              activity.add_ons = item.data?.add_ons;
              activity.seasons = item.data?.seasons;
              activity.currency = item.data?.currency;
              activity.notes = item.data?.notes;
            }
            activity.day_number = dayIndex + 1;
            activity.autoOpenSheet = true;
          } else {
            const isLibraryTransfer = item.source === "library";
            activity.transfer_package_id = isLibraryTransfer ? null : item.id;
            activity.transfer_id = isLibraryTransfer ? null : item.parentId;
            activity.library_item_id = isLibraryTransfer ? item.libraryItemId : undefined;
            activity.is_manual = isLibraryTransfer;
            activity.transfer_name = item.name;
            activity.transfer_city = item.data?.transfer_city || item.data?.city;
            activity.transfer_country = item.data?.transfer_country || item.data?.country;
            activity.package_name = item.packageName;
            activity.package_description = item.data?.package_description;
            activity.images = item.images || item.data?.images || [];
            activity.pickup_point = item.data?.pickup_point || item.data?.from_location;
            activity.drop_point = item.data?.drop_point || item.data?.to_location;
            activity.transfer_type = item.data?.transfer_type;
            activity.mode = item.mode;
            if (isLibraryTransfer) {
              activity.transfer_mode = item.data?.transfer_mode;
              activity.is_sic = item.data?.is_sic;
              activity.pickup_date = item.data?.pickup_date;
              activity.pickup_time = item.data?.pickup_time;
              activity.drop_date = item.data?.drop_date;
              activity.drop_time = item.data?.drop_time;
              activity.meeting_point = item.data?.meeting_point;
              activity.duration_hours = item.data?.duration_hours;
              activity.duration_days = item.data?.duration_days;
              activity.distance_km = item.data?.distance_km;
              activity.inclusions = item.data?.inclusions;
              activity.exclusions = item.data?.exclusions;
              activity.cancellation_policy = item.data?.cancellation_policy;
              activity.agency_cancellation_policy = item.data?.agency_cancellation_policy;
              activity.age_policy = item.data?.age_policy;
              activity.add_ons = item.data?.add_ons;
              activity.seasons = item.data?.seasons;
              activity.currency = item.data?.currency;
              activity.notes = item.data?.notes;
            }
            activity.day_number = dayIndex + 1;
            activity.autoOpenSheet = true;
          }

          await onAddActivity(activity);
        }
        setOpen(false);
        setSelectedItems([]);
        setSearchQuery("");
      } finally {
        setIsAdding(false);
      }
      return;
    }

    // Single-select path for meals/guides
    if (!selectedItem) return;

    setIsAdding(true);
    try {
      const activity: any = {
        activity_id: crypto.randomUUID(),
        package_type: selectedItem.category,
        title: selectedItem.packageName ? `${selectedItem.name} - ${selectedItem.packageName}` : selectedItem.name,
        activity: selectedItem.name,
        status: "included",
      };

      switch (selectedItem.category) {
        case "meal":
          activity.meal_id = selectedItem.id;
          activity.meal_name = selectedItem.name;
          break;
        case "guide":
          activity.guide_id = selectedItem.id;
          activity.guide_name = selectedItem.name;
          break;
      }

      await onAddActivity(activity);
      setOpen(false);
      setSelectedItem(null);
      setSearchQuery("");
    } finally {
      setIsAdding(false);
    }
  };

  const activeService = SERVICE_TYPES.find((s) => s.id === activeType);

  return (
    <>
      {/* Manual Sheets - rendered outside popover */}
      <ManualHotelSheet
        open={showManualHotelForm}
        onOpenChange={setShowManualHotelForm}
        onSave={handleSaveManualHotel}
        isSaving={isAdding}
      />
      <ManualTourSheet
        open={showManualTourForm}
        onOpenChange={setShowManualTourForm}
        onSave={handleSaveManualTour}
        isSaving={isAdding}
      />
      <ManualTransferSheet
        open={showManualTransferForm}
        onOpenChange={setShowManualTransferForm}
        onSave={handleSaveManualTransfer}
        isSaving={isAdding}
      />

      <Popover open={open} onOpenChange={(value) => !isAdding && setOpen(value)}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          side={isPanelExpanded ? "right" : "left"}
          sideOffset={8}
          align="start"
          collisionPadding={16}
          className="w-[30vw] h-[80vh] min-w-[420px] max-w-xl p-0 overflow-hidden"
        >
          <SidebarProvider defaultOpen={false} className="h-full !min-h-0">
            <Sidebar collapsible="icon" className="h-full" variant="floating">
              <SidebarContent className="py-2">
                <SidebarGroup className="p-0">
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1 px-2 ">
                      {SERVICE_TYPES.map((item) => {
                        const isActive = activeType === item.id;
                        const isDisabled = item.id === "flight";

                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              asChild
                              tooltip={item.label}
                              className={cn(
                                "h-9 hover:bg-muted",
                                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                                isDisabled && "opacity-40 cursor-not-allowed"
                              )}
                            >
                              <button onClick={() => !isDisabled && handleTypeChange(item.id)} disabled={isDisabled}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </button>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <div className="flex flex-1 flex-col h-full overflow-hidden">
              {/* Hotel Room Selection View */}
              {selectedHotel ? (
                <>
                  {/* Header with back button */}
                  <div className="p-3 border-b shrink-0">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBackToHotels}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{selectedHotel.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedHotel.location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Room List */}
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-2 space-y-1">
                      {(selectedHotel.rooms || []).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="text-sm font-medium">No rooms available</p>
                          <p className="text-xs mt-1">
                            {selectedHotel.source === "library"
                              ? "Edit this library hotel to add rooms"
                              : "Add rooms to this hotel in the Rates section"}
                          </p>
                        </div>
                      ) : (
                        (selectedHotel.rooms || []).map((room, index) => {
                          const isRoomSelected = selectedRoom?.id === room.id;
                          return (
                            <div key={room.id}>
                              {index > 0 && <Separator className="my-1" />}
                              <div
                                onClick={() => handleSelectRoom(room)}
                                className={cn(
                                  "w-full text-left p-2.5 rounded-lg transition-all border border-transparent overflow-hidden cursor-pointer",
                                  "hover:bg-muted hover:border-border",
                                  isRoomSelected && "bg-primary/10 ring-1 ring-primary border-primary/20"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2 w-full">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="font-medium text-sm text-foreground line-clamp-1">
                                        {room.room_category}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {room.meal_plan && (
                                        <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                                          {room.meal_plan}
                                        </Badge>
                                      )}
                                      {room.max_occupancy && (
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {room.max_occupancy}
                                        </span>
                                      )}
                                    </div>
                                    {room.other_details && (
                                      <p className="text-[11px] text-muted-foreground/70 line-clamp-1">
                                        {room.other_details}
                                      </p>
                                    )}
                                  </div>
                                  {isRoomSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <>
                  {/* Search */}
                  <div className="p-3 border-b shrink-0 space-y-2">
                    {/* Source tabs for hotel/tour/transfer */}
                    {(activeType === "hotel" || activeType === "tour" || activeType === "transfer") && (
                      <Tabs value={itemSource} onValueChange={(v) => handleItemSourceChange(v as ItemSource)}>
                        <TabsList className="w-full h-8">
                          <TabsTrigger value="dmc" className="flex-1 text-xs h-7">
                            DMC {activeType === "hotel" ? "Hotels" : activeType === "tour" ? "Tours" : "Transfers"}
                          </TabsTrigger>
                          <TabsTrigger value="library" className="flex-1 text-xs h-7">
                            My Library
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={`Search ${
                          activeType === "hotel" || activeType === "tour" || activeType === "transfer"
                            ? itemSource === "library"
                              ? `library ${activeType}s`
                              : `DMC ${activeType}s`
                            : `${activeType}s`
                        }...`}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    {/* Manual entry buttons - only show in library tab */}
                    {activeType === "hotel" && itemSource === "library" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => {
                          setOpen(false);
                          setShowManualHotelForm(true);
                        }}
                      >
                        <PenLine className="h-3.5 w-3.5 mr-1.5" />
                        Add Manual Hotel
                      </Button>
                    )}
                    {activeType === "tour" && itemSource === "library" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => {
                          setOpen(false);
                          setShowManualTourForm(true);
                        }}
                      >
                        <PenLine className="h-3.5 w-3.5 mr-1.5" />
                        Add Manual Tour
                      </Button>
                    )}
                    {activeType === "transfer" && itemSource === "library" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => {
                          setOpen(false);
                          setShowManualTransferForm(true);
                        }}
                      >
                        <PenLine className="h-3.5 w-3.5 mr-1.5" />
                        Add Manual Transfer
                      </Button>
                    )}
                  </div>

                  {/* Content */}
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-2 space-y-1">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : items.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          {activeService && <activeService.icon className="h-10 w-10 mx-auto mb-3 opacity-40" />}
                          <p className="text-sm font-medium">
                            {activeType === "flight"
                              ? "Flight search coming soon"
                              : (activeType === "hotel" || activeType === "tour" || activeType === "transfer") &&
                                  itemSource === "library"
                                ? searchQuery
                                  ? `No library ${activeType}s found`
                                  : `No ${activeType}s in your library`
                                : searchQuery
                                  ? `No ${activeService?.label.toLowerCase()} found`
                                  : `No ${activeService?.label.toLowerCase()} available`}
                          </p>
                          {!searchQuery && activeType !== "flight" && (
                            <p className="text-xs mt-1">
                              {(activeType === "hotel" || activeType === "tour" || activeType === "transfer") &&
                              itemSource === "library"
                                ? `Add ${activeType}s using the button above`
                                : "Try adding some in the Rates section"}
                            </p>
                          )}
                        </div>
                      ) : (
                        items.map((item, index) => {
                          const isMultiSelect = item.category === "tour" || item.category === "transfer";
                          const isSelected = isMultiSelect
                            ? selectedItems.some((s) => s.id === item.id)
                            : selectedItem?.id === item.id && selectedItem?.category === item.category;
                          const isHotel = item.category === "hotel";
                          // Format duration
                          const formatDuration = (d: any) => {
                            if (!d) return null;
                            const parts = [];
                            if (d.days) parts.push(`${d.days}d`);
                            if (d.hours) parts.push(`${d.hours}h`);
                            if (d.minutes) parts.push(`${d.minutes}m`);
                            return parts.length > 0 ? parts.join(" ") : null;
                          };
                          const durationStr = formatDuration(item.duration);

                          return (
                            <div key={`${item.category}-${item.id}`}>
                              {index > 0 && <Separator className="my-1" />}
                              <div
                                onClick={() => handleSelectItem(item)}
                                className={cn(
                                  "w-full text-left p-2.5 rounded-lg transition-all border border-transparent overflow-hidden cursor-pointer",
                                  "hover:bg-muted hover:border-border",
                                  isSelected && "bg-primary/10 ring-1 ring-primary border-primary/20"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2 w-full">
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    {isHotel ? (
                                      /* Hotel Card - Normal display */
                                      <>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium text-sm text-foreground line-clamp-1">
                                            {item.name}
                                          </span>
                                          {item.preferred && (
                                            <Badge className="text-[10px] font-normal px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
                                              ⭐ Preferred
                                            </Badge>
                                          )}
                                        </div>
                                        {item.description && (
                                          <p className="text-xs text-muted-foreground capitalize">{item.description}</p>
                                        )}
                                        {item.location && (
                                          <p className="text-[11px] text-muted-foreground/70 line-clamp-1">
                                            {item.location}
                                          </p>
                                        )}
                                        {item.rooms && item.rooms.length > 0 && (
                                          <p className="text-[11px] text-muted-foreground">
                                            {item.rooms.length} room{item.rooms.length > 1 ? "s" : ""} available
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      /* Tour/Transfer/Other Card - Badge display */
                                      <>
                                        {/* Parent name (tour/transfer name) + Preferred badge */}
                                        <div className="flex items-center gap-1.5">
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] font-normal px-1.5 py-0 text-muted-foreground max-w-full truncate"
                                          >
                                            {item.name}
                                          </Badge>
                                          {item.preferred && (
                                            <Badge className="text-[10px] font-normal px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
                                              ⭐ Preferred
                                            </Badge>
                                          )}
                                        </div>
                                        {/* Header: Package name + Mode badge + Duration */}
                                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                          {item.packageName && (
                                            <span className="font-medium text-sm text-foreground line-clamp-2 break-words">
                                              {item.packageName}
                                            </span>
                                          )}
                                          {/* {item.mode && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] font-normal px-1.5 py-0 shrink-0 whitespace-nowrap"
                                          >
                                            {item.mode}
                                          </Badge>
                                        )} */}
                                        </div>
                                        {/* Route for transfers */}
                                        {item.route && (
                                          <p className="text-xs text-muted-foreground line-clamp-1">📍 {item.route}</p>
                                        )}
                                        {/* Location · Duration */}
                                        {(item.location || durationStr) && (
                                          <p className="text-[11px] text-muted-foreground/70 line-clamp-1 flex items-center gap-1">
                                            {item.location}
                                            {item.location && durationStr && <span className="mx-0.5">·</span>}
                                            {durationStr && (
                                              <>
                                                <Clock className="h-3 w-3" />
                                                <span>{durationStr}</span>
                                              </>
                                            )}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {isMultiSelect ? (
                                    <div className={cn(
                                      "h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                    )}>
                                      {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                    </div>
                                  ) : (
                                    <>
                                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                      {isHotel && (
                                        <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}

              {/* Footer */}
              <div className="p-3 border-t flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-muted-foreground truncate flex-1">
                  {selectedHotel ? (
                    selectedRoom ? (
                      <span>
                        Selected: <span className="font-medium text-foreground">{selectedRoom.room_category}</span>
                      </span>
                    ) : (
                      <span>Select a room to add</span>
                    )
                  ) : (activeType === "tour" || activeType === "transfer") ? (
                    selectedItems.length > 0 ? (
                      <span>
                        <span className="font-medium text-foreground">{selectedItems.length}</span> selected
                      </span>
                    ) : (
                      <span>Select items to add</span>
                    )
                  ) : selectedItem ? (
                    <span>
                      Selected:{" "}
                      <span className="font-medium text-foreground">
                        {selectedItem.packageName || selectedItem.name}
                      </span>
                    </span>
                  ) : (
                    <span>Select an item to add</span>
                  )}
                </div>

                {/* Nights selector for hotels */}
                {selectedHotel && selectedRoom && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-muted-foreground">Nights:</label>
                    <Input
                      type="number"
                      min={1}
                      max={maxNightsFromDay}
                      value={hotelNights}
                      onChange={(e) =>
                        setHotelNights(Math.min(Math.max(1, parseInt(e.target.value) || 1), maxNightsFromDay))
                      }
                      className="w-16 h-8 text-xs text-center"
                    />
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={handleAddActivity}
                  disabled={
                    isAdding ||
                    (selectedHotel
                      ? !selectedRoom
                      : (activeType === "tour" || activeType === "transfer")
                        ? selectedItems.length === 0
                        : !selectedItem)
                  }
                  className="shrink-0"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Adding...
                    </>
                  ) : (activeType === "tour" || activeType === "transfer") && selectedItems.length > 0 ? (
                    <>
                      <Plus className="size-4" />
                      Add ({selectedItems.length})
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SidebarProvider>
        </PopoverContent>
      </Popover>
    </>
  );
}
