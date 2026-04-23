/**
 * Generate Embeddings Script
 *
 * Populates embedding columns for all existing hotels, tours, and transfers
 * Uses database-side generate_embedding() function
 * Run with: npx tsx scripts/generate-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper functions to create search text (matching database function logic)
function createHotelSearchText(room: any): string {
  const parts = [room.hotel_name, room.room_category, room.hotel_city, room.hotel_country];

  if (room.meal_plan) parts.push(room.meal_plan);
  if (room.star_rating) parts.push(`${room.star_rating} star hotel`);

  return parts.join(" | ");
}

function createTourSearchText(tour: any): string {
  return [tour.tour_name, tour.package_name, tour.city, tour.country].join(" | ");
}

function createTransferSearchText(transfer: any): string {
  const parts = [transfer.transfer_name, transfer.package_name, transfer.city, transfer.country];

  if (transfer.route) parts.push(`Route: ${transfer.route}`);
  if (transfer.mode) parts.push(`Mode: ${transfer.mode}`);

  return parts.join(" | ");
}

async function generateHotelEmbeddings() {
  // Fetch all hotels with their rooms
  const { data: hotelRooms, error } = await supabase.from("vw_hotel_rooms").select("*").is("embedding", null); // Only process rooms without embeddings

  if (error) {
    console.error("Error fetching hotel rooms:", error);
    throw error;
  }

  if (!hotelRooms || hotelRooms.length === 0) {
    console.log("✅ No hotels need embeddings");
    return;
  }

  console.log(`📊 Found ${hotelRooms.length} hotel rooms to process`);

  // Generate embeddings using database function
  console.log("🔄 Generating embeddings via database function...");
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < hotelRooms.length; i++) {
    const searchText = createHotelSearchText(hotelRooms[i]);

    // Call database function to generate embedding
    const { data: embedding, error: embeddingError } = await supabase.rpc("generate_embedding", {
      input_text: searchText,
    });

    if (embeddingError || !embedding) {
      console.error(`Error generating embedding for room ${hotelRooms[i].id}:`, embeddingError);
      errorCount++;
      continue;
    }

    // Update room with embedding
    const { error: updateError } = await supabase.from("hotel_rooms").update({ embedding }).eq("id", hotelRooms[i].id);

    if (updateError) {
      console.error(`Error updating room ${hotelRooms[i].id}:`, updateError);
      errorCount++;
    } else {
      successCount++;
    }

    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${hotelRooms.length}`);
    }
  }

  console.log(`✅ Hotel embeddings generated: ${successCount} success, ${errorCount} errors`);
}

async function generateTourEmbeddings() {
  console.log("🎯 Generating tour embeddings...");

  const { data: tourPackages, error } = await supabase.from("vw_tours_packages").select("*").is("embedding", null);

  if (error) {
    console.error("Error fetching tour packages:", error);
    throw error;
  }

  if (!tourPackages || tourPackages.length === 0) {
    console.log("✅ No tours need embeddings");
    return;
  }

  console.log(`📊 Found ${tourPackages.length} tour packages to process`);

  console.log("🔄 Generating embeddings via database function...");
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < tourPackages.length; i++) {
    const searchText = createTourSearchText(tourPackages[i]);

    const { data: embedding, error: embeddingError } = await supabase.rpc("generate_embedding", {
      input_text: searchText,
    });

    if (embeddingError || !embedding) {
      console.error(`Error generating embedding for tour ${tourPackages[i].id}:`, embeddingError);
      errorCount++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("tour_packages")
      .update({ embedding })
      .eq("id", tourPackages[i].id);

    if (updateError) {
      console.error(`Error updating tour ${tourPackages[i].id}:`, updateError);
      errorCount++;
    } else {
      successCount++;
    }

    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${tourPackages.length}`);
    }
  }

  console.log(`✅ Tour embeddings generated: ${successCount} success, ${errorCount} errors`);
}

async function generateTransferEmbeddings() {
  console.log("🚐 Generating transfer embeddings...");

  const { data: transferPackages, error } = await supabase
    .from("vw_transfers_packages")
    .select("*")
    .is("embedding", null);

  if (error) {
    console.error("Error fetching transfer packages:", error);
    throw error;
  }

  if (!transferPackages || transferPackages.length === 0) {
    console.log("✅ No transfers need embeddings");
    return;
  }

  console.log(`📊 Found ${transferPackages.length} transfer packages to process`);

  console.log("🔄 Generating embeddings via database function...");
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < transferPackages.length; i++) {
    const searchText = createTransferSearchText(transferPackages[i]);

    const { data: embedding, error: embeddingError } = await supabase.rpc("generate_embedding", {
      input_text: searchText,
    });

    if (embeddingError || !embedding) {
      console.error(`Error generating embedding for transfer ${transferPackages[i].id}:`, embeddingError);
      errorCount++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("transfer_packages")
      .update({ embedding })
      .eq("id", transferPackages[i].id);

    if (updateError) {
      console.error(`Error updating transfer ${transferPackages[i].id}:`, updateError);
      errorCount++;
    } else {
      successCount++;
    }

    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${transferPackages.length}`);
    }
  }

  console.log(`✅ Transfer embeddings generated: ${successCount} success, ${errorCount} errors`);
}

async function main() {
  console.log("🚀 Starting embedding generation...\n");

  try {
    await generateHotelEmbeddings();
    await generateTourEmbeddings();
    await generateTransferEmbeddings();

    console.log("\n✨ All embeddings generated successfully!");
  } catch (error) {
    console.error("\n❌ Error generating embeddings:", error);
    process.exit(1);
  }
}

main();
