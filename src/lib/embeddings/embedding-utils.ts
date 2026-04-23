/**
 * Embedding Utilities
 *
 * Generate vector embeddings for travel services using OpenAI
 * Supports hotels, tours, and transfers with semantic search
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use OpenAI's text-embedding-3-small model (1536 dimensions, $0.02 per 1M tokens)
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI allows up to 2048 inputs per request
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: "float",
      });

      embeddings.push(...response.data.map((d) => d.embedding));
    } catch (error) {
      console.error(`Error generating embeddings for batch ${i / batchSize}:`, error);
      throw new Error("Failed to generate embeddings batch");
    }
  }

  return embeddings;
}

/**
 * Create searchable text from hotel data
 */
export function createHotelSearchText(hotel: {
  hotel_name: string;
  hotel_city: string;
  hotel_country: string;
  room_category: string;
  meal_plan?: string;
  star_rating?: number;
  amenities?: string[];
}): string {
  const parts = [
    hotel.hotel_name,
    hotel.room_category,
    hotel.hotel_city,
    hotel.hotel_country,
  ];

  if (hotel.meal_plan) {
    parts.push(hotel.meal_plan);
  }

  if (hotel.star_rating) {
    parts.push(`${hotel.star_rating} star hotel`);
  }

  if (hotel.amenities && hotel.amenities.length > 0) {
    parts.push(`Amenities: ${hotel.amenities.join(", ")}`);
  }

  return parts.join(" | ");
}

/**
 * Create searchable text from tour data
 */
export function createTourSearchText(tour: {
  tour_name: string;
  package_name: string;
  city: string;
  country: string;
  description?: string;
  duration?: string;
}): string {
  const parts = [
    tour.tour_name,
    tour.package_name,
    tour.city,
    tour.country,
  ];

  if (tour.description) {
    parts.push(tour.description);
  }

  if (tour.duration) {
    parts.push(`Duration: ${tour.duration}`);
  }

  return parts.join(" | ");
}

/**
 * Create searchable text from transfer data
 */
export function createTransferSearchText(transfer: {
  transfer_name: string;
  package_name: string;
  route?: string;
  mode?: string;
  city: string;
  country: string;
}): string {
  const parts = [
    transfer.transfer_name,
    transfer.package_name,
    transfer.city,
    transfer.country,
  ];

  if (transfer.route) {
    parts.push(`Route: ${transfer.route}`);
  }

  if (transfer.mode) {
    parts.push(`Mode: ${transfer.mode}`);
  }

  return parts.join(" | ");
}

/**
 * Create searchable text from combo data
 */
export function createComboSearchText(combo: {
  title: string;
  description?: string | null;
  package_names?: string | null;
}): string {
  const parts = [combo.title];

  if (combo.description) {
    parts.push(combo.description);
  }

  if (combo.package_names) {
    parts.push(`Includes: ${combo.package_names}`);
  }

  return parts.join(" | ");
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
