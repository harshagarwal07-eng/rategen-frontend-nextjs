-- Migration: Remove embedding auto-generation triggers
-- Purpose: Embedding generation via database triggers causes timeouts on bulk operations
--          because generate_embedding() makes synchronous external API calls.
--          Instead, embeddings will be generated from the application layer after save.
-- ============================================================================

-- Drop all hotel room embedding triggers
DROP TRIGGER IF EXISTS auto_generate_hotel_room_embedding ON hotel_rooms;
DROP TRIGGER IF EXISTS trigger_auto_generate_hotel_room_embedding_insert ON hotel_rooms;
DROP TRIGGER IF EXISTS trigger_auto_generate_hotel_room_embedding_update ON hotel_rooms;

-- Drop all tour package embedding triggers
DROP TRIGGER IF EXISTS auto_generate_tour_package_embedding ON tour_packages;
DROP TRIGGER IF EXISTS trigger_auto_generate_tour_package_embedding_insert ON tour_packages;
DROP TRIGGER IF EXISTS trigger_auto_generate_tour_package_embedding_update ON tour_packages;

-- Drop all transfer package embedding triggers
DROP TRIGGER IF EXISTS auto_generate_transfer_package_embedding ON transfer_packages;
DROP TRIGGER IF EXISTS trigger_auto_generate_transfer_package_embedding_insert ON transfer_packages;
DROP TRIGGER IF EXISTS trigger_auto_generate_transfer_package_embedding_update ON transfer_packages;

-- Note: We keep the functions (auto_generate_hotel_room_embedding, etc.) in case
-- they're needed for manual regeneration, but the triggers are removed so they
-- don't fire on INSERT/UPDATE anymore.

-- Embeddings are now generated from the application layer:
-- - src/data-access/hotels.ts: regenerateHotelRoomEmbeddings()
-- - src/data-access/tours.ts: regenerateTourPackageEmbeddings()
-- - src/data-access/transfers.ts: regenerateTransferPackageEmbeddings()
