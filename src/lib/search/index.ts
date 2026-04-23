/**
 * Shared Search Utilities
 *
 * Re-exports all search utilities for the itinerary pipeline.
 * These utilities are shared between the new micro-agent architecture
 * and can be used by both the old system (during migration) and the new pipeline.
 *
 * Usage:
 * ```typescript
 * import {
 *   searchHotels,
 *   selectBestHotel,
 *   searchAndSelectHotel,
 *   // ... other utilities
 * } from "@/lib/search";
 * ```
 */

// =====================================================
// TYPES
// =====================================================

export type {
  // Common
  SearchOptions,
  SelectionContext,
  LLMSelectionResult,

  // Hotels
  HotelSearchResult,
  RoomSearchResult,
  HotelSelection,
  RoomSplit,

  // Tours
  TourSearchResult,
  TourSelection,
  TourDuration,
  OperationalHour,

  // Transfers
  TransferSearchResult,
  TransferSelection,

  // Combos
  ComboSearchResult,
  ComboSelection,
  ComboFullDetails,
  ComboItem,
  ComboSeason,
} from "./types";

// =====================================================
// HOTEL SEARCH
// =====================================================

export {
  // Search functions
  searchHotels,
  fetchHotelRooms,
  fetchRoomDetails,

  // Selection functions
  selectBestHotel,
  selectBestRoom,

  // Multi-option support
  detectMultiOptionIntent,
  selectMultipleHotels,

  // High-level convenience
  searchAndSelectHotel,
} from "./hotel-search";

// =====================================================
// TOUR SEARCH
// =====================================================

export {
  // Search functions
  searchTours,
  searchToursWithDestination,
  fetchTourDetails,

  // Selection functions
  selectBestTour,
  detectTourBasis,

  // High-level convenience
  searchAndSelectTour,
  searchAndSelectMultipleTours,
} from "./tour-search";

// =====================================================
// TRANSFER SEARCH
// =====================================================

export {
  // Search functions
  searchTransfers,
  searchTransfersWithDestination,
  fetchTransferDetails,

  // Selection functions
  selectBestTransfer,
  detectTransferDirection,
  detectTransferBasis,

  // High-level convenience
  searchAndSelectTransfer,
  searchAndSelectRoundtripTransfers,
} from "./transfer-search";

// Re-export TransferDirection type
export type { TransferDirection } from "./transfer-search";

// =====================================================
// COMBO SEARCH
// =====================================================

export {
  // Search functions
  searchCombos,
  fetchComboDetails,

  // Detection/Validation functions
  detectComboServices,
  comboMatchesRequestedServices,
  validateCombosWithLLM,
  checkComboRateAvailability,

  // Optimal variant selection (LLM-based)
  selectOptimalComboVariants,

  // High-level convenience
  searchAndSelectCombos,
} from "./combo-search";

export type { ComboTravelersInfo } from "./combo-search";

// =====================================================
// CAR ON DISPOSAL SEARCH
// =====================================================

export {
  // Search functions
  searchCarOnDisposal,
  selectBestCarOnDisposal,
  fetchCarOnDisposalDetails,
} from "./car-on-disposal-search";

export type {
  CarOnDisposalSearchResult,
  CarOnDisposalSelection,
} from "./car-on-disposal-search";
