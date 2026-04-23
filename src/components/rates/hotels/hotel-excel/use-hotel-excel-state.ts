"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Hotel } from "@/types/hotels";
import { toast } from "sonner";

interface UseHotelExcelStateProps {
  hotels: Hotel[];
  isOpen: boolean;
}

export function useHotelExcelState({ hotels, isOpen }: UseHotelExcelStateProps) {
  const [editedHotels, setEditedHotels] = useState<Hotel[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Use ref for functional updates
  const hotelsRef = useRef<Hotel[]>([]);
  hotelsRef.current = editedHotels;

  // Track if we've initialized for this dialog session
  const initializedRef = useRef(false);
  const wasOpenRef = useRef(false);

  // Track original IDs for deletion detection
  const [originalHotelIds, setOriginalHotelIds] = useState<string[]>([]);
  const [originalRoomIdsByHotel, setOriginalRoomIdsByHotel] = useState<Record<string, string[]>>({});

  // Initialize state ONLY when dialog opens (transitions from closed to open)
  useEffect(() => {
    // Detect dialog opening (was closed, now open)
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    // Reset initialization tracking when dialog closes
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }

    // Only initialize once when dialog opens
    if (justOpened && !initializedRef.current && hotels && Array.isArray(hotels)) {
      // Deep clone hotels
      const cloned = JSON.parse(JSON.stringify(hotels));
      setEditedHotels(cloned);
      hotelsRef.current = cloned;
      setHasChanges(false);
      initializedRef.current = true;

      // Track original IDs for deletion detection
      setOriginalHotelIds(hotels.map((h) => h.id));
      const roomIds: Record<string, string[]> = {};
      hotels.forEach((h) => {
        if (h.rooms && h.rooms.length > 0) {
          roomIds[h.id] = h.rooms.map((r) => r.id!).filter(Boolean);
        }
      });
      setOriginalRoomIdsByHotel(roomIds);
    }
  }, [isOpen, hotels]);

  // Update a single hotel field
  const updateHotelField = useCallback((hotelId: string, field: string, value: any) => {
    setEditedHotels((prev) => {
      return prev.map((hotel) => {
        if (hotel.id === hotelId) {
          return { ...hotel, [field]: value };
        }
        return hotel;
      });
    });
    setHasChanges(true);
  }, []);

  // Batch update multiple hotel fields at once (for bulk operations like delete)
  const batchUpdateHotelFields = useCallback((updates: Array<{ hotelId: string; field: string; value: any }>) => {
    setEditedHotels((prev) => {
      // Group updates by hotelId
      const updatesByHotel = new Map<string, Array<{ field: string; value: any }>>();
      updates.forEach(({ hotelId, field, value }) => {
        if (!updatesByHotel.has(hotelId)) {
          updatesByHotel.set(hotelId, []);
        }
        updatesByHotel.get(hotelId)!.push({ field, value });
      });

      return prev.map((hotel) => {
        const hotelUpdates = updatesByHotel.get(hotel.id);
        if (!hotelUpdates) return hotel;

        let updatedHotel = { ...hotel };
        hotelUpdates.forEach(({ field, value }) => {
          updatedHotel = { ...updatedHotel, [field]: value };
        });
        return updatedHotel;
      });
    });
    setHasChanges(true);
  }, []);

  // Update a room field
  const updateRoomField = useCallback((hotelId: string, roomId: string, field: string, value: any) => {
    setEditedHotels((prev) => {
      return prev.map((hotel) => {
        if (hotel.id === hotelId && hotel.rooms) {
          return {
            ...hotel,
            rooms: hotel.rooms.map((room) => {
              if (room.id === roomId) {
                return { ...room, [field]: value };
              }
              return room;
            }),
          };
        }
        return hotel;
      });
    });
    setHasChanges(true);
  }, []);

  // Update a season field
  const updateSeasonField = useCallback(
    (hotelId: string, roomId: string, seasonIndex: number, field: string, value: any) => {
      setEditedHotels((prev) => {
        return prev.map((hotel) => {
          if (hotel.id === hotelId && hotel.rooms) {
            return {
              ...hotel,
              rooms: hotel.rooms.map((room) => {
                if (room.id === roomId && room.seasons) {
                  return {
                    ...room,
                    seasons: room.seasons.map((season, idx) => {
                      if (idx === seasonIndex) {
                        return { ...season, [field]: value };
                      }
                      return season;
                    }),
                  };
                }
                return room;
              }),
            };
          }
          return hotel;
        });
      });
      setHasChanges(true);
    },
    []
  );

  // Delete hotels by their IDs
  const deleteHotels = useCallback((hotelIds: string[]) => {
    setEditedHotels((prev) => prev.filter((hotel) => !hotelIds.includes(hotel.id)));
    setHasChanges(true);
  }, []);

  // Add a new policy row (pax category) to a hotel - starts with empty pax category
  const addPolicy = useCallback((hotelId: string, afterPaxCategory?: string) => {
    setEditedHotels((prev) => {
      return prev.map((hotel) => {
        if (hotel.id !== hotelId) return hotel;

        // Use a unique temporary key (UUID) that will be renamed when user selects pax category
        const tempKey = crypto.randomUUID();

        // Add new entry to age_policy with temporary key
        const newAgePolicy = {
          ...hotel.age_policy,
          [tempKey]: { rooms: { from: null, to: null }, meals: { from: null, to: null } },
        };

        return { ...hotel, age_policy: newAgePolicy };
      });
    });
    setHasChanges(true);
  }, []);

  // Delete policy rows by their composite IDs (hotelId:::paxCategory)
  const deletePolicies = useCallback((compositeIds: string[]) => {
    // Group by hotel
    const deleteMap = new Map<string, string[]>();
    compositeIds.forEach((id) => {
      const [hotelId, paxCategory] = id.split(":::");
      if (!hotelId || !paxCategory) return;
      if (!deleteMap.has(hotelId)) {
        deleteMap.set(hotelId, []);
      }
      deleteMap.get(hotelId)!.push(paxCategory.toLowerCase());
    });

    setEditedHotels((prev) => {
      return prev.map((hotel) => {
        const paxCategoriesToDelete = deleteMap.get(hotel.id);
        if (!paxCategoriesToDelete) return hotel;

        // Remove from age_policy
        const newAgePolicy = { ...hotel.age_policy };
        paxCategoriesToDelete.forEach((paxKey) => {
          delete newAgePolicy[paxKey as keyof typeof newAgePolicy];
        });

        // Remove from meal_plan_rates
        const newMealRates = (hotel.meal_plan_rates || []).map((rate: any) => {
          if (!rate.rates) return rate;
          const newRates = { ...rate.rates };
          paxCategoriesToDelete.forEach((paxKey) => {
            delete newRates[paxKey];
          });
          return { ...rate, rates: newRates };
        });

        return { ...hotel, age_policy: newAgePolicy, meal_plan_rates: newMealRates };
      });
    });
    setHasChanges(true);
  }, []);

  // Track newly created IDs (for upsert - these don't exist in DB yet)
  const [newHotelIds, setNewHotelIds] = useState<Set<string>>(new Set());
  const [newRoomIds, setNewRoomIds] = useState<Set<string>>(new Set());

  // Add a new hotel (optionally after a specific hotel)
  const addHotel = useCallback((afterHotelId?: string) => {
    const newHotelId = crypto.randomUUID();
    const newRoomId = crypto.randomUUID();
    setNewHotelIds((prev) => new Set(prev).add(newHotelId));
    setNewRoomIds((prev) => new Set(prev).add(newRoomId));
    setEditedHotels((prev) => {
      // Initialize with all 4 age policy categories
      const defaultAgePolicy = {
        adult: { rooms: { from: null, to: null }, meals: { from: null, to: null } },
        teenager: { rooms: { from: null, to: null }, meals: { from: null, to: null } },
        child: { rooms: { from: null, to: null }, meals: { from: null, to: null } },
        infant: { rooms: { from: null, to: null }, meals: { from: null, to: null } },
      };

      // Create a default empty room
      const defaultRoom = {
        id: newRoomId,
        room_category: "",
        meal_plan: "",
        max_occupancy: "",
        other_details: "",
        extra_bed_policy: "",
        stop_sale: "",
        sort_order: 0,
        seasons: [],
      };

      const newHotel = {
        id: newHotelId,
        created_at: new Date().toISOString(),
        hotel_name: "",
        hotel_code: "",
        hotel_address: "",
        hotel_city: "",
        hotel_country: "",
        hotel_phone: "",
        hotel_email: "",
        hotel_description: "",
        hotel_currency: "",
        examples: "",
        offers: "",
        cancellation_policy: "",
        remarks: "",
        payment_policy: "",
        group_policy: "",
        property_type: "",
        star_rating: "",
        preferred: false,
        markup: 0,
        rooms: [defaultRoom],
        age_policy: defaultAgePolicy,
        meal_plan_rates: [],
      } as Hotel;

      if (afterHotelId) {
        const idx = prev.findIndex((h) => h.id === afterHotelId);
        if (idx !== -1) {
          const newList = [...prev];
          newList.splice(idx + 1, 0, newHotel);
          return newList;
        }
      }
      // Add new hotel at the end (will be sorted by updated_at)
      return [...prev, newHotel];
    });
    setHasChanges(true);
  }, []);

  // Duplicate an existing hotel with all its data (rooms, seasons, policies)
  const duplicateHotel = useCallback((hotelId: string) => {
    setEditedHotels((prev) => {
      const sourceHotel = prev.find((h) => h.id === hotelId);
      if (!sourceHotel) return prev;

      // Deep clone the hotel
      const cloned = JSON.parse(JSON.stringify(sourceHotel)) as Hotel;

      // Generate new IDs
      const newHotelId = crypto.randomUUID();
      cloned.id = newHotelId;
      cloned.created_at = new Date().toISOString();
      cloned.updated_at = new Date().toISOString();
      cloned.hotel_datastore_id = null;
      cloned.is_unlinked = false;
      cloned.hotel_name = `${cloned.hotel_name} (Copy)`;

      // Track new hotel ID
      setNewHotelIds((p) => new Set(p).add(newHotelId));

      // Generate new IDs for all rooms
      if (cloned.rooms && cloned.rooms.length > 0) {
        cloned.rooms = cloned.rooms.map((room) => {
          const newRoomId = crypto.randomUUID();
          setNewRoomIds((p) => new Set(p).add(newRoomId));
          return { ...room, hotel_room_datastore_id: null, is_unlinked: false, id: newRoomId };
        });
      }

      // Insert after the source hotel
      const idx = prev.findIndex((h) => h.id === hotelId);
      if (idx !== -1) {
        const newList = [...prev];
        newList.splice(idx + 1, 0, cloned);
        return newList;
      }

      return [...prev, cloned];
    });
    setHasChanges(true);
  }, []);

  // Add a new room to a hotel (optionally after a specific room, with initial values)
  const addRoom = useCallback((hotelId: string, afterRoomId?: string, initialValues?: Record<string, any>) => {
    const newId = crypto.randomUUID();
    setNewRoomIds((prev) => new Set(prev).add(newId));
    setEditedHotels((prev) => {
      return prev.map((hotel) => {
        if (hotel.id === hotelId) {
          // Create a default empty season
          const defaultSeason = {
            season_name: "",
            dates: "",
            single_pp: null,
            double_pp: null,
            extra_bed_pp: null,
            child_no_bed: null,
            rate_per_night: null,
          };

          const newRoom = {
            id: newId,
            room_category: "",
            meal_plan: "",
            max_occupancy: "",
            other_details: "",
            extra_bed_policy: "",
            stop_sale: "",
            sort_order: hotel.rooms?.length || 0,
            seasons: [defaultSeason],
            ...initialValues, // Apply any initial values passed in
          };

          const rooms = hotel.rooms || [];
          if (afterRoomId) {
            const idx = rooms.findIndex((r) => r.id === afterRoomId);
            if (idx !== -1) {
              const newRooms = [...rooms];
              newRooms.splice(idx + 1, 0, newRoom);
              return { ...hotel, rooms: newRooms };
            }
          }
          // Add new room at the end
          return {
            ...hotel,
            rooms: [...rooms, newRoom],
          };
        }
        return hotel;
      });
    });
    setHasChanges(true);
  }, []);

  // Delete rooms by their composite IDs (hotelId:::roomId)
  const deleteRooms = useCallback(
    (compositeIds: string[]) => {
      // Check if deletion would leave any hotel with 0 rooms
      const hotelsRef = editedHotels;
      for (const hotel of hotelsRef) {
        const roomIdsToDelete = compositeIds
          .filter((id) => id.startsWith(`${hotel.id}:::`))
          .map((id) => id.split(":::")[1]);

        if (roomIdsToDelete.length > 0 && hotel.rooms) {
          const remainingRooms = hotel.rooms.filter((room) => !roomIdsToDelete.includes(room.id!));
          if (remainingRooms.length === 0) {
            toast.error(`Cannot delete all rooms. "${hotel.hotel_name || "Hotel"}" must have at least one room.`);
            return;
          }
        }
      }

      setEditedHotels((prev) => {
        return prev.map((hotel) => {
          const roomIdsToDelete = compositeIds
            .filter((id) => id.startsWith(`${hotel.id}:::`))
            .map((id) => id.split(":::")[1]);

          if (roomIdsToDelete.length > 0 && hotel.rooms) {
            return {
              ...hotel,
              rooms: hotel.rooms.filter((room) => !roomIdsToDelete.includes(room.id!)),
            };
          }
          return hotel;
        });
      });
      setHasChanges(true);
    },
    [editedHotels]
  );

  // Add a new season to a room (optionally after a specific season index, with initial values)
  const addSeason = useCallback(
    (hotelId: string, roomId: string, afterSeasonIndex?: number, initialValues?: Record<string, any>) => {
      setEditedHotels((prev) => {
        return prev.map((hotel) => {
          if (hotel.id === hotelId && hotel.rooms) {
            return {
              ...hotel,
              rooms: hotel.rooms.map((room) => {
                if (room.id === roomId) {
                  const newSeason = {
                    dates: "",
                    single_pp: null,
                    double_pp: null,
                    extra_bed_pp: null,
                    child_no_bed: null,
                    rate_per_night: null,
                    ...initialValues, // Apply any initial values passed in
                  };

                  const seasons = room.seasons || [];
                  if (afterSeasonIndex !== undefined && afterSeasonIndex >= 0 && afterSeasonIndex < seasons.length) {
                    const newSeasons = [...seasons];
                    newSeasons.splice(afterSeasonIndex + 1, 0, newSeason);
                    return { ...room, seasons: newSeasons };
                  }
                  // Add new season at the end
                  return {
                    ...room,
                    seasons: [...seasons, newSeason],
                  };
                }
                return room;
              }),
            };
          }
          return hotel;
        });
      });
      setHasChanges(true);
    },
    []
  );

  // Delete seasons by their composite IDs (hotelId:::roomId:::seasonIndex)
  const deleteSeasons = useCallback(
    (compositeIds: string[]) => {
      // Group by hotel and room
      const deleteMap = new Map<string, Map<string, number[]>>();
      compositeIds.forEach((id) => {
        const parts = id.split(":::");
        if (parts.length !== 3) return;
        const hotelId = parts[0];
        const roomId = parts[1];
        const seasonIndex = parseInt(parts[2], 10);

        if (!deleteMap.has(hotelId)) {
          deleteMap.set(hotelId, new Map());
        }
        const roomMap = deleteMap.get(hotelId)!;
        if (!roomMap.has(roomId)) {
          roomMap.set(roomId, []);
        }
        roomMap.get(roomId)!.push(seasonIndex);
      });

      // Validate that no room will be left with 0 seasons
      const hotelsRef = editedHotels;
      for (const hotel of hotelsRef) {
        const roomMap = deleteMap.get(hotel.id);
        if (!roomMap || !hotel.rooms) continue;

        for (const room of hotel.rooms) {
          const seasonIndices = roomMap.get(room.id!);
          if (!seasonIndices || !room.seasons) continue;

          const remainingSeasons = room.seasons.filter((_, idx) => !seasonIndices.includes(idx));
          if (remainingSeasons.length === 0) {
            toast.error(`Cannot delete all seasons. "${room.room_category || "Room"}" must have at least one season.`);
            return;
          }
        }
      }

      setEditedHotels((prev) => {
        return prev.map((hotel) => {
          const roomMap = deleteMap.get(hotel.id);
          if (!roomMap || !hotel.rooms) return hotel;

          return {
            ...hotel,
            rooms: hotel.rooms.map((room) => {
              const seasonIndices = roomMap.get(room.id!);
              if (!seasonIndices || !room.seasons) return room;

              return {
                ...room,
                seasons: room.seasons.filter((_, idx) => !seasonIndices.includes(idx)),
              };
            }),
          };
        });
      });
      setHasChanges(true);
    },
    [editedHotels]
  );

  // Reset to original data
  const resetChanges = useCallback(() => {
    if (hotels && Array.isArray(hotels)) {
      setEditedHotels(JSON.parse(JSON.stringify(hotels)));
    }
    setHasChanges(false);
  }, [hotels]);

  // Mark as saved
  const markAsSaved = useCallback(() => {
    setHasChanges(false);
  }, []);

  // Refresh state with saved hotels (after successful save)
  const refreshWithSavedData = useCallback((savedHotels: Hotel[]) => {
    setEditedHotels(savedHotels);
    hotelsRef.current = savedHotels;
    setHasChanges(false);
    // Clear new ID tracking (all items are now saved in DB)
    setNewHotelIds(new Set());
    setNewRoomIds(new Set());
    // Update original IDs to reflect the new saved state
    setOriginalHotelIds(savedHotels.map((h) => h.id));
    const roomIds: Record<string, string[]> = {};
    savedHotels.forEach((h) => {
      if (h.rooms && h.rooms.length > 0) {
        roomIds[h.id] = h.rooms.map((r) => r.id!).filter(Boolean);
      }
    });
    setOriginalRoomIdsByHotel(roomIds);
  }, []);

  return {
    editedHotels,
    hasChanges,
    originalHotelIds,
    originalRoomIdsByHotel,
    newHotelIds,
    newRoomIds,
    updateHotelField,
    updateRoomField,
    updateSeasonField,
    addHotel,
    duplicateHotel,
    deleteHotels,
    addRoom,
    deleteRooms,
    addSeason,
    deleteSeasons,
    resetChanges,
    markAsSaved,
    refreshWithSavedData,
  };
}
