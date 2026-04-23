import { env } from "./env";
import { CreatePlaceData } from "@/types/places";

declare global {
  interface Window {
    google: any;
  }
}

interface TourData {
  tour_name: string;
  description: string;
  country: string;
  state: string;
  city: string;
  remarks: string;
  // New Google Places fields
  formatted_address: string;
  website: string;
  latitude: number;
  longitude: number;
  rating: number;
  user_ratings_total: number;
  photos: Record<string, any>;
  types: string[];
  review_summary: string;
  maps_url: string;
  place_id: string;
  // AI-generated fields
  cancellation_policy?: string;
  child_policy?: string;
  currency?: string;
}

interface PlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string;
  addressComponents: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
  location: {
    lat: number;
    lng: number;
  };
  viewport?: {
    low: { lat: number; lng: number };
    high: { lat: number; lng: number };
  };
  types: string[];
  rating?: number;
  userRatingCount?: number;
  websiteURI?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
  primaryType?: string;
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions?: Array<{
      displayName: string;
      uri: string;
      photoUri: string;
    }>;
  }>;
  priceLevel?: string;
  reviews?: Array<{
    name: string;
    relativePublishTimeDescription: string;
    rating: number;
    text: {
      text: string;
    };
    originalText: {
      text: string;
    };
    authorAttribution: {
      displayName: string;
      uri: string;
      photoUri: string;
    };
    publishTime: string;
  }>;
  regularOpeningHours?: {
    openNow: boolean;
    periods: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions: string[];
  };
  paymentOptions?: {
    acceptsCashOnly?: boolean;
    acceptsCreditCards?: boolean;
    acceptsDebitCards?: boolean;
    acceptsNFC?: boolean;
  };
  parkingOptions?: {
    freeParking?: boolean;
    freeParkingLot?: boolean;
    freeStreetParking?: boolean;
    paidParking?: boolean;
    paidParkingLot?: boolean;
    paidStreetParking?: boolean;
    valetParking?: boolean;
  };
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  hasDineIn?: boolean;
  hasTakeout?: boolean;
  hasDelivery?: boolean;
  isReservable?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesVegetarianFood?: boolean;
  hasOutdoorSeating?: boolean;
  hasLiveMusic?: boolean;
  isGoodForChildren?: boolean;
  isGoodForGroups?: boolean;
  goodForWatchingSports?: boolean;
}

// Load Google Maps JavaScript API
export async function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${env.GOOGLE_PLACES_API_KEY}&libraries=places&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export async function searchGooglePlaces(
  query: string
): Promise<PlaceResult[]> {
  try {
    await loadGoogleMaps();

    const { Place } = await window.google.maps.importLibrary("places");

    const request = {
      textQuery: query,
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "addressComponents",
        "location",
        "viewport",
        "types",
        "primaryType",
        "rating",
        "userRatingCount",
        "websiteURI",
        "internationalPhoneNumber",
        "nationalPhoneNumber",
        "businessStatus",
        "photos",
        "priceLevel",
        "reviews",
        "regularOpeningHours",
        "paymentOptions",
        "parkingOptions",
        "accessibilityOptions",
        "hasDineIn",
        "hasTakeout",
        "hasDelivery",
        "isReservable",
        "servesBreakfast",
        "servesLunch",
        "servesDinner",
        "servesBeer",
        "servesWine",
        "servesVegetarianFood",
        "hasOutdoorSeating",
        "hasLiveMusic",
        "isGoodForChildren",
        "isGoodForGroups",
      ],
      includedType: "tourist_attraction",
      maxResultCount: 5,
      language: "en-US",
    };

    const { places } = await Place.searchByText(request);

    return places || [];
  } catch (error) {
    console.error("Error searching Google Places:", error);
    throw error;
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult> {
  try {
    await loadGoogleMaps();

    const { Place } = await window.google.maps.importLibrary("places");

    const place = new Place({
      id: placeId,
      requestedLanguage: "en-US",
    });

    await place.fetchFields({
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "addressComponents",
        "location",
        "viewport",
        "types",
        "primaryType",
        "rating",
        "userRatingCount",
        "websiteURI",
        "internationalPhoneNumber",
        "nationalPhoneNumber",
        "businessStatus",
        "photos",
        "priceLevel",
        "reviews",
        "regularOpeningHours",
        "paymentOptions",
        "parkingOptions",
        "accessibilityOptions",
        "hasDineIn",
        "hasTakeout",
        "hasDelivery",
        "isReservable",
        "servesBreakfast",
        "servesLunch",
        "servesDinner",
        "servesBeer",
        "servesWine",
        "servesVegetarianFood",
        "hasOutdoorSeating",
        "hasLiveMusic",
        "isGoodForChildren",
        "isGoodForGroups",
      ],
    });

    return place;
  } catch (error) {
    console.error("Error getting place details:", error);
    throw error;
  }
}

export interface PhotoUrlInfo {
  url: string;
  name: string;
}

export async function getPhotoUrls(
  place: PlaceResult
): Promise<PhotoUrlInfo[]> {
  try {
    await loadGoogleMaps();
    const actualPlace = (place as any).Dg || place;

    if (!actualPlace.photos || !actualPlace.photos.length) {
      return [];
    }

    const getPhotoUrl = (photoName: string, maxWidth: number = 800) => {
      return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${env.GOOGLE_PLACES_API_KEY}`;
    };

    const photoUrls = actualPlace.photos
      .map((photo: any) => {
        try {
          if (!photo.name) {
            console.error("Photo missing name:", photo);
            return null;
          }
          return {
            url: getPhotoUrl(photo.name),
            name: photo.name.split("/").pop() || `photo-${Date.now()}`,
          };
        } catch (error) {
          console.error("Error getting photo URL:", error);
          return null;
        }
      })
      .filter(
        (item: PhotoUrlInfo | null): item is PhotoUrlInfo => item !== null
      );

    return photoUrls;
  } catch (error) {
    console.error("Error getting photo URLs:", error);
    return [];
  }
}

// Convert PlaceResult to Place table data
export function mapPlaceResultToPlaceData(
  place: PlaceResult,
  searchTerm?: string
): CreatePlaceData {
  // Extract actual place data from Google's internal structure
  const actualPlace = (place as any).Dg || place;

  // Serialize address components to plain objects
  const addressComponents =
    actualPlace.addressComponents?.map((comp: any) => ({
      longText: comp.longText || "",
      shortText: comp.shortText || "",
      types: Array.isArray(comp.types) ? [...comp.types] : [],
    })) || [];

  // Generate review summary from reviews
  let reviewSummary = "";
  if (actualPlace.reviews && actualPlace.reviews.length > 0) {
    const totalReviews = actualPlace.reviews.length;
    const avgRating = actualPlace.rating || 0;
    reviewSummary = `Based on ${totalReviews} recent reviews with an average rating of ${avgRating}/5. `;

    // Add a sample of positive comments
    const positiveReviews = actualPlace.reviews.filter(
      (r: any) => r.rating >= 4
    );
    if (positiveReviews.length > 0) {
      const firstReview = positiveReviews[0];
      const reviewText =
        firstReview?.text?.text || firstReview?.originalText?.text;
      if (reviewText && typeof reviewText === "string") {
        reviewSummary += `Visitors highlight: "${reviewText.substring(
          0,
          100
        )}..."`;
      }
    }
  }

  // Serialize photos to plain objects
  const serializedPhotos =
    actualPlace.photos?.map((photo: any) => ({
      name: photo.name || "",
      widthPx: photo.widthPx || 0,
      heightPx: photo.heightPx || 0,
      authorAttributions:
        photo.authorAttributions?.map((attr: any) => ({
          displayName: attr.displayName || "",
          uri: attr.uri || "",
          photoUri: attr.photoUri || "",
        })) || [],
    })) || null;

  // Serialize reviews to plain objects
  const serializedReviews =
    actualPlace.reviews?.map((review: any) => ({
      name: review.name || "",
      relativePublishTimeDescription:
        review.relativePublishTimeDescription || "",
      rating: review.rating || 0,
      text: review.text?.text || "",
      originalText: review.originalText?.text || "",
      authorAttribution: {
        displayName: review.authorAttribution?.displayName || "",
        uri: review.authorAttribution?.uri || "",
        photoUri: review.authorAttribution?.photoUri || "",
      },
      publishTime: review.publishTime || "",
    })) || null;

  // Serialize opening hours periods to plain objects
  const serializedPeriods =
    actualPlace.regularOpeningHours?.periods?.map((period: any) => ({
      open: {
        day: period.open?.day || 0,
        hour: period.open?.hour || 0,
        minute: period.open?.minute || 0,
      },
      close: {
        day: period.close?.day || 0,
        hour: period.close?.hour || 0,
        minute: period.close?.minute || 0,
      },
    })) || null;

  // Serialize complex options to plain objects
  const serializedParkingOptions = actualPlace.parkingOptions
    ? {
        freeParking: actualPlace.parkingOptions.freeParking || false,
        freeParkingLot: actualPlace.parkingOptions.freeParkingLot || false,
        freeStreetParking:
          actualPlace.parkingOptions.freeStreetParking || false,
        paidParking: actualPlace.parkingOptions.paidParking || false,
        paidParkingLot: actualPlace.parkingOptions.paidParkingLot || false,
        paidStreetParking:
          actualPlace.parkingOptions.paidStreetParking || false,
        valetParking: actualPlace.parkingOptions.valetParking || false,
      }
    : null;

  const serializedPaymentOptions = actualPlace.paymentOptions
    ? {
        acceptsCashOnly: actualPlace.paymentOptions.acceptsCashOnly || false,
        acceptsCreditCards:
          actualPlace.paymentOptions.acceptsCreditCards || false,
        acceptsDebitCards:
          actualPlace.paymentOptions.acceptsDebitCards || false,
        acceptsNFC: actualPlace.paymentOptions.acceptsNFC || false,
      }
    : null;

  // Generate Maps URL
  const mapsUrl = `https://maps.google.com/maps?place_id=${actualPlace.id}`;

  return {
    place_id: actualPlace.id,
    name: actualPlace.displayName || null,
    formatted_address: actualPlace.formattedAddress || null,
    international_phone_number: actualPlace.internationalPhoneNumber || null,
    national_phone_number: actualPlace.nationalPhoneNumber || null,
    website: actualPlace.websiteURI || null,
    url: actualPlace.websiteURI || null,
    latitude: actualPlace.location?.lat || null,
    longitude: actualPlace.location?.lng || null,
    viewport_ne_lat: actualPlace.viewport?.high?.lat || null,
    viewport_ne_lng: actualPlace.viewport?.high?.lng || null,
    viewport_sw_lat: actualPlace.viewport?.low?.lat || null,
    viewport_sw_lng: actualPlace.viewport?.low?.lng || null,
    business_status: actualPlace.businessStatus || null,
    price_level: actualPlace.priceLevel || null,
    rating: actualPlace.rating || null,
    user_ratings_total: actualPlace.userRatingCount || null,
    open_now: actualPlace.regularOpeningHours?.openNow || null,
    periods: serializedPeriods,
    weekday_text: actualPlace.regularOpeningHours?.weekdayDescriptions
      ? [...actualPlace.regularOpeningHours.weekdayDescriptions]
      : null,
    photos: serializedPhotos,
    types: actualPlace.types ? [...actualPlace.types] : null,
    primary_type: actualPlace.primaryType || null,
    wheelchair_accessible_entrance:
      actualPlace.accessibilityOptions?.wheelchairAccessibleEntrance || null,
    delivery: actualPlace.hasDelivery || null,
    dine_in: actualPlace.hasDineIn || null,
    takeout: actualPlace.hasTakeout || null,
    reservable: actualPlace.isReservable || null,
    serves_beer: actualPlace.servesBeer || null,
    serves_breakfast: actualPlace.servesBreakfast || null,
    serves_brunch: null, // Not available in new API
    serves_dinner: actualPlace.servesDinner || null,
    serves_lunch: actualPlace.servesLunch || null,
    serves_vegetarian_food: actualPlace.servesVegetarianFood || null,
    serves_wine: actualPlace.servesWine || null,
    outdoor_seating: actualPlace.hasOutdoorSeating || null,
    live_music: actualPlace.hasLiveMusic || null,
    good_for_children: actualPlace.isGoodForChildren || null,
    good_for_groups: actualPlace.isGoodForGroups || null,
    parking: actualPlace.parkingOptions
      ? Object.values(actualPlace.parkingOptions).some(Boolean)
      : null,
    parking_options: serializedParkingOptions,
    payment_options: serializedPaymentOptions,
    reviews: serializedReviews,
    review_summary: reviewSummary || null,
    maps_url: mapsUrl,
    place_id_short: actualPlace.id.split("/").pop() || null,
    geometry: {
      location: actualPlace.location
        ? {
            lat: actualPlace.location.lat || 0,
            lng: actualPlace.location.lng || 0,
          }
        : null,
      viewport: actualPlace.viewport
        ? {
            low: actualPlace.viewport.low
              ? {
                  lat: actualPlace.viewport.low.lat || 0,
                  lng: actualPlace.viewport.low.lng || 0,
                }
              : null,
            high: actualPlace.viewport.high
              ? {
                  lat: actualPlace.viewport.high.lat || 0,
                  lng: actualPlace.viewport.high.lng || 0,
                }
              : null,
          }
        : null,
    },
    address_components: addressComponents,
    search_terms: searchTerm ? [searchTerm.toLowerCase()] : [],
  };
}

export function mapPlaceToTourData(place: PlaceResult): TourData {
  // Extract actual place data from Google's internal structure
  const actualPlace = (place as any).Dg || place;

  const addressComponents = actualPlace.addressComponents || [];

  // Extract location information
  const country =
    addressComponents.find((comp: any) => comp.types.includes("country"))
      ?.longText || "";

  const state =
    addressComponents.find((comp: any) =>
      comp.types.includes("administrative_area_level_1")
    )?.longText || "";

  const city =
    addressComponents.find(
      (comp: any) =>
        comp.types.includes("locality") ||
        comp.types.includes("administrative_area_level_2")
    )?.longText || "";

  // Generate remarks with additional information
  let remarks = "";
  if (actualPlace.websiteURI) {
    remarks += `Website: ${actualPlace.websiteURI}\n`;
  }
  if (actualPlace.nationalPhoneNumber) {
    remarks += `Phone: ${actualPlace.nationalPhoneNumber}\n`;
  }
  if (actualPlace.rating) {
    remarks += `Rating: ${actualPlace.rating}/5 (${actualPlace.userRatingCount} reviews)\n`;
  }
  if (actualPlace.priceLevel) {
    remarks += `Price Level: ${actualPlace.priceLevel}\n`;
  }

  // Generate review summary
  let reviewSummary = "";
  if (actualPlace.reviews && actualPlace.reviews.length > 0) {
    const totalReviews = actualPlace.reviews.length;
    const avgRating = actualPlace.rating || 0;
    reviewSummary = `Based on ${totalReviews} recent reviews with an average rating of ${avgRating}/5.`;

    const positiveReviews = actualPlace.reviews.filter(
      (r: any) => r.rating >= 4
    );
    if (positiveReviews.length > 0) {
      const firstReview = positiveReviews[0];
      const reviewText =
        firstReview?.text?.text || firstReview?.originalText?.text;
      if (reviewText && typeof reviewText === "string") {
        reviewSummary += ` Visitors often mention: "${reviewText.substring(
          0,
          100
        )}..."`;
      }
    }
  }

  return {
    tour_name: actualPlace.displayName || "",
    country,
    state,
    city,
    remarks: remarks.trim(),
    formatted_address: actualPlace.formattedAddress || "",
    website: actualPlace.websiteURI || "",
    latitude: actualPlace.location?.lat || 0,
    longitude: actualPlace.location?.lng || 0,
    rating: actualPlace.rating || 0,
    user_ratings_total: actualPlace.userRatingCount || 0,
    photos: actualPlace.photos || {},
    types: actualPlace.types || [],
    review_summary: reviewSummary,
    maps_url: `https://maps.google.com/maps?place_id=${actualPlace.id}`,
    place_id: actualPlace.id,
    description: "",
  };
}
