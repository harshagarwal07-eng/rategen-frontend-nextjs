/**
 * Image Fetcher
 *
 * Fetches primary images for tours, hotels, and transfers
 * Used by service mapper to populate image_url in activities
 */

import { createClient } from "@/utils/supabase/server";

interface ImageResult {
  id: string;
  image_url: string | null;
}

/**
 * Fetch primary image for a tour
 * Returns the first image from the tour's images array
 */
export async function fetchTourImage(tourId: string): Promise<string | null> {
  try {
    const supabase = await createClient(true);

    const { data, error } = await supabase
      .from("tours")
      .select("images")
      .eq("id", tourId)
      .single();

    if (error || !data) {
      console.log(`[ImageFetcher] No tour image found for: ${tourId}`);
      return null;
    }

    const images = data.images as string[] | null;
    return images && images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error(`[ImageFetcher] Error fetching tour image:`, error);
    return null;
  }
}

/**
 * Fetch primary image for a hotel
 * Returns the first image from the hotel's images array
 */
export async function fetchHotelImage(hotelId: string): Promise<string | null> {
  try {
    const supabase = await createClient(true);

    const { data, error } = await supabase
      .from("hotels")
      .select("images")
      .eq("id", hotelId)
      .single();

    if (error || !data) {
      console.log(`[ImageFetcher] No hotel image found for: ${hotelId}`);
      return null;
    }

    const images = data.images as string[] | null;
    return images && images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error(`[ImageFetcher] Error fetching hotel image:`, error);
    return null;
  }
}

/**
 * Fetch primary image for a transfer
 * Returns the first image from the transfer's images array
 */
export async function fetchTransferImage(transferId: string): Promise<string | null> {
  try {
    const supabase = await createClient(true);

    const { data, error } = await supabase
      .from("transfers")
      .select("images")
      .eq("id", transferId)
      .single();

    if (error || !data) {
      console.log(`[ImageFetcher] No transfer image found for: ${transferId}`);
      return null;
    }

    const images = data.images as string[] | null;
    return images && images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error(`[ImageFetcher] Error fetching transfer image:`, error);
    return null;
  }
}

/**
 * Batch fetch images for multiple tours
 */
export async function fetchTourImagesBatch(tourIds: string[]): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  if (tourIds.length === 0) return imageMap;

  try {
    const supabase = await createClient(true);

    const { data, error } = await supabase
      .from("tours")
      .select("id, images")
      .in("id", tourIds);

    if (error || !data) {
      console.log(`[ImageFetcher] Batch tour images: error or no data`);
      return imageMap;
    }

    for (const tour of data) {
      const images = tour.images as string[] | null;
      if (images && images.length > 0) {
        imageMap.set(tour.id, images[0]);
      }
    }

    console.log(`[ImageFetcher] Batch fetched ${imageMap.size} tour images`);
    return imageMap;
  } catch (error) {
    console.error(`[ImageFetcher] Error batch fetching tour images:`, error);
    return imageMap;
  }
}

/**
 * Batch fetch images for multiple hotels
 */
export async function fetchHotelImagesBatch(hotelIds: string[]): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  if (hotelIds.length === 0) return imageMap;

  try {
    const supabase = await createClient(true);

    const { data, error } = await supabase
      .from("hotels")
      .select("id, images")
      .in("id", hotelIds);

    if (error || !data) {
      console.log(`[ImageFetcher] Batch hotel images: error or no data`);
      return imageMap;
    }

    for (const hotel of data) {
      const images = hotel.images as string[] | null;
      if (images && images.length > 0) {
        imageMap.set(hotel.id, images[0]);
      }
    }

    console.log(`[ImageFetcher] Batch fetched ${imageMap.size} hotel images`);
    return imageMap;
  } catch (error) {
    console.error(`[ImageFetcher] Error batch fetching hotel images:`, error);
    return imageMap;
  }
}

/**
 * Batch fetch images for multiple transfers
 */
export async function fetchTransferImagesBatch(transferIds: string[]): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  if (transferIds.length === 0) return imageMap;

  try {
    const supabase = await createClient(true);

    const { data, error } = await supabase
      .from("transfers")
      .select("id, images")
      .in("id", transferIds);

    if (error || !data) {
      console.log(`[ImageFetcher] Batch transfer images: error or no data`);
      return imageMap;
    }

    for (const transfer of data) {
      const images = transfer.images as string[] | null;
      if (images && images.length > 0) {
        imageMap.set(transfer.id, images[0]);
      }
    }

    console.log(`[ImageFetcher] Batch fetched ${imageMap.size} transfer images`);
    return imageMap;
  } catch (error) {
    console.error(`[ImageFetcher] Error batch fetching transfer images:`, error);
    return imageMap;
  }
}
