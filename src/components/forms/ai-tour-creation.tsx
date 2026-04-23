"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import {
  searchGooglePlaces,
  getPlaceDetails,
  getPhotoUrls,
  mapPlaceToTourData,
  mapPlaceResultToPlaceData,
} from "@/lib/google-places";
import {
  createOrUpdatePlace,
  addSearchTermToPlace,
} from "@/data-access/places";
import { fetchCountries, fetchCities } from "@/data-access/datastore";
import { generateTourInfo } from "@/lib/gemini-ai";
import Image from "next/image";
import { uploadToS3 } from "@/lib/s3-upload";
import useUser from "@/hooks/use-user";

interface PlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  types: string[];
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
}

interface TourData {
  tour_name: string;
  description: string;
  country: string;
  city: string;
  remarks: string;
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
  cancellation_policy?: string;
  child_policy?: string;
  currency?: string;
  images?: string[];
  timings?: string[];
}

interface Props {
  onPlaceSelected: (tourData: any) => void;
  onCancel: () => void;
}

// Helper function to map country and city names to UUIDs
async function mapLocationNamesToUUIDs(countryName: string, cityName: string) {
  try {
    const [countries, cities] = await Promise.all([
      fetchCountries(),
      fetchCities(),
    ]);

    const country = countries.find(
      (c) => c.label.toLowerCase() === countryName.toLowerCase()
    );

    const city = cities.find(
      (c) => c.label.toLowerCase() === cityName.toLowerCase()
    );

    return {
      countryId: country?.value || "",
      cityId: city?.value || "",
    };
  } catch (error) {
    console.error("Error mapping location names to UUIDs:", error);
    return {
      countryId: "",
      cityId: "",
    };
  }
}

export default function AITourCreation({ onPlaceSelected, onCancel }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<string | null>(null);
  const { user } = useUser();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a tour name to search");
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchGooglePlaces(searchQuery);
      setPlaces(results);

      if (results.length === 0) {
        toast.info("No places found. Try a different search term.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error(
        "Failed to search places. Please check your API configuration."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = async (place: PlaceResult) => {
    setIsLoadingDetails(place.id);
    try {
      // Get detailed place information
      const detailedPlace = await getPlaceDetails(place.id);

      // Get photo URLs and upload to S3
      const photoInfos = await getPhotoUrls(detailedPlace);
      let uploadedImageUrls: string[] = [];

      if (photoInfos.length > 0 && user?.id) {
        toast.loading("Uploading place photos...", { id: "photo-upload" });

        try {
          const uploadPromises = photoInfos.map(async (photoInfo) => {
            try {
              // Fetch the image
              const response = await fetch(photoInfo.url);
              if (!response.ok) throw new Error("Failed to fetch image");
              const blob = await response.blob();

              // Create a File object with the original photo name
              const file = new File([blob], `${photoInfo.name}.jpg`, {
                type: "image/jpeg",
              });

              // Upload to S3
              const result = await uploadToS3({
                file,
                userId: user.id,
              });

              if (result.error) throw new Error(result.error);
              return result.url!;
            } catch (error) {
              console.error("Failed to process photo:", error);
              return null;
            }
          });

          const results = await Promise.all(uploadPromises);
          uploadedImageUrls = results.filter(
            (url): url is string => url !== null
          );

          toast.dismiss("photo-upload");
          if (uploadedImageUrls.length > 0) {
            toast.success(
              `Successfully uploaded ${uploadedImageUrls.length} photos`
            );
          }
        } catch (error) {
          console.error("Error uploading photos:", error);
          toast.dismiss("photo-upload");
          toast.error("Failed to upload some photos");
        }
      }

      // Convert to place data for storage
      const placeData = mapPlaceResultToPlaceData(detailedPlace, searchQuery);

      // Store/update in places table
      const { error: placeError } = await createOrUpdatePlace(placeData);
      if (placeError) {
        console.error("Error storing place data:", placeError);
      } else {
        await addSearchTermToPlace(detailedPlace.id, searchQuery);
      }

      // Convert to tour data for form
      let tourData = mapPlaceToTourData(detailedPlace) as TourData;

      // Extract country from address components for AI
      const actualPlace = (detailedPlace as any).Dg || detailedPlace;
      const addressComponents = actualPlace.addressComponents || [];
      const country =
        addressComponents.find((comp: any) => comp.types.includes("country"))
          ?.longText || "";

      // Generate AI-enhanced tour information
      try {
        toast.loading("Generating tour details with AI...", {
          id: "ai-loading",
        });

        const aiData = await generateTourInfo({
          name: detailedPlace.displayName || "",
          address: detailedPlace.formattedAddress || "",
          types: detailedPlace.types || [],
          country: country,
          rating: detailedPlace.rating,
          reviewSummary: tourData.review_summary,
          website: detailedPlace.websiteURI,
        });

        // Map country and city names to UUIDs
        const { countryId, cityId } = await mapLocationNamesToUUIDs(
          country || "",
          aiData.city || ""
        );

        // Merge AI data with tour data and add uploaded images
        // Note: Don't add AI-generated description or cancellation_policy - let user fill these in
        tourData = {
          ...tourData,
          // description: Keep empty - don't use AI-generated description
          // cancellation_policy: Don't set - let user add manually
          child_policy: aiData.child_policy,
          currency: aiData.currency,
          country: countryId, // Use UUID instead of name
          city: cityId, // Use UUID instead of name
          images: uploadedImageUrls,
          timings: placeData.weekday_text || [],
        };

        toast.dismiss("ai-loading");
        toast.success("Tour data populated with AI-enhanced information!");
      } catch (aiError) {
        console.error("Error generating AI data:", aiError);
        toast.dismiss("ai-loading");
        toast.success("Tour data populated from Google Places!");

        // Even if AI fails, try to map location from address components
        const { countryId, cityId } = await mapLocationNamesToUUIDs(
          country || "",
          tourData.city || ""
        );

        // Still set the images and mapped locations even if AI fails
        tourData = {
          ...tourData,
          country: countryId,
          city: cityId,
          images: uploadedImageUrls,
        };
      }

      // Call onPlaceSelected with the tour data
      onPlaceSelected(tourData);
    } catch (error) {
      console.error("Error getting place details:", error);
      toast.error("Failed to get place details. Please try again.");
    } finally {
      setIsLoadingDetails(null);
    }
  };

  const getPhotoUrl = (photoName: string, maxWidth: number = 300) => {
    // For the new Places API, we need to use a different approach for photos
    // The photo name can be used with the Place Photo API
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Create Tour with AI</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Search for a place and we&apos;ll automatically populate tour details
          using Google Places
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Enter tour name or place (e.g., 'Eiffel Tower Paris', 'Grand Canyon')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {places.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Select a place to create tour:</h4>
          {places.map((place) => (
            <Card
              key={place.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {place.photos && place.photos[0] && (
                    <Image
                      src={getPhotoUrl(place.photos[0].name)}
                      alt={place.displayName}
                      className="rounded-md flex-shrink-0 w-auto h-auto"
                      width={80}
                      height={80}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h5 className="font-semibold text-sm truncate">
                          {place.displayName}
                        </h5>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {place.formattedAddress}
                        </p>

                        {place.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">
                              {place.rating}
                            </span>
                            {place.userRatingCount && (
                              <span className="text-xs text-muted-foreground">
                                ({place.userRatingCount} reviews)
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1 mt-2">
                          {place.types.slice(0, 3).map((type: string) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="text-xs px-2 py-0 capitalize"
                            >
                              {type.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleSelectPlace(place)}
                        disabled={isLoadingDetails === place.id}
                      >
                        {isLoadingDetails === place.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Select"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
