"use client";

import React from "react";
import ExpandableDataTable, {
  ExpandableTableColumn,
  BaseRowData,
} from "@/components/common/expandable-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Hotel as HotelIcon,
  Star,
  Bed,
  Calendar,
  MapPin,
  Tag,
} from "lucide-react";
import { EyePopover } from "@/components/common/eye-popover";
import { CURRENCY_OPTIONS_LABEL, HOTEL_STAR_RATING } from "@/constants/data";
import { CellAction } from "./cell-actions";
import { Hotel } from "@/types/hotels";

// Hotel data interface extending BaseRowData
export interface HotelTableData extends BaseRowData, Hotel {
  // Additional computed fields if needed
  total_rooms?: number;
  total_seasons?: number;
  country_name?: string;
  city_name?: string;
}

interface HotelsExpandableTableProps {
  hotels: Hotel[];
  isDatastore?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedIds?: string[];
}

export function HotelsExpandableTable({
  hotels,
  isDatastore = false,
  onSelectionChange,
  selectedIds = [],
}: HotelsExpandableTableProps) {
  // Convert Hotel[] to HotelTableData[]
  const tableData: HotelTableData[] = hotels.map((hotel) => ({
    ...hotel,
    total_rooms: hotel.rooms?.length || 0,
    total_seasons:
      hotel.rooms?.reduce(
        (total, room) => total + (room.seasons?.length || 0),
        0
      ) || 0,
    // If country_name/city_name don't exist, use the original fields
    country_name: (hotel as any).country_name || hotel.hotel_country,
    city_name: (hotel as any).city_name || hotel.hotel_city,
  }));

  // Define table columns based on whether it's datastore view or not
  const columns: ExpandableTableColumn<HotelTableData>[] = [
    // Selection column for datastore
    ...(isDatastore
      ? [
          {
            id: "select",
            accessorKey: "id" as keyof HotelTableData,
            header: "",
            sortable: false,
            width: "50",
            cell: ({ row }: { row: any }) => (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(row.original.id)}
                  onCheckedChange={() => {
                    const newSelected = selectedIds.includes(row.original.id)
                      ? selectedIds.filter((id) => id !== row.original.id)
                      : [...selectedIds, row.original.id];
                    onSelectionChange?.(newSelected);
                  }}
                  aria-label={`Select ${row.original.hotel_name}`}
                />
              </div>
            ),
          },
        ]
      : []),

    {
      id: "hotel_name",
      accessorKey: "hotel_name",
      header: "Hotel Name",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <HotelIcon className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{row.original.hotel_name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {row.original.star_rating && (
                <div className="flex items-center">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1">
                    {
                      HOTEL_STAR_RATING.find(
                        (v) => v.value === row.original.star_rating
                      )?.label
                    }
                  </span>
                </div>
              )}
              {row.original.total_rooms && (
                <span>
                  {row.original.total_rooms} room
                  {row.original.total_rooms > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },

    {
      id: "description",
      accessorKey: "hotel_description",
      header: "Description",
      sortable: false,
      cell: ({ row }) => (
        <EyePopover
          title="Description"
          description={row.original.hotel_description || "-"}
        />
      ),
    },

    {
      id: "location",
      accessorKey: "country_name",
      header: "Location",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
          <div className="text-sm">
            <div>{row.original.country_name}</div>
            {row.original.city_name && (
              <div className="text-xs text-muted-foreground">
                {row.original.city_name}
              </div>
            )}
          </div>
        </div>
      ),
    },

    {
      id: "currency",
      accessorKey: "hotel_currency",
      header: "Currency",
      sortable: true,
      cell: ({ row }) => (
        <div className="text-center">
          {CURRENCY_OPTIONS_LABEL(row.original.hotel_currency)}
        </div>
      ),
    },

    {
      id: "rooms_count",
      accessorKey: "total_rooms",
      header: "Rooms",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Bed className="h-4 w-4 mr-1 text-muted-foreground" />
          <Badge variant={(row.original.total_rooms || 0) > 0 ? "default" : "outline"}>
            {row.original.total_rooms || 0}
          </Badge>
        </div>
      ),
    },

    {
      id: "seasons_count",
      accessorKey: "total_seasons",
      header: "Seasons",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
          <Badge
            variant={(row.original.total_seasons || 0) > 0 ? "default" : "outline"}
          >
            {row.original.total_seasons || 0}
          </Badge>
        </div>
      ),
    },

    {
      id: "policies",
      accessorKey: "payment_policy",
      header: "Policies",
      sortable: false,
      cell: ({ row }) => (
        <div className="space-y-1">
          <EyePopover
            title="Payment Policy"
            description={row.original.payment_policy || "-"}
          />
          <EyePopover
            title="Cancellation Policy"
            description={row.original.cancellation_policy || "-"}
          />
        </div>
      ),
    },

    // Actions column for non-datastore
    ...(!isDatastore
      ? [
          {
            id: "actions",
            accessorKey: "id" as keyof HotelTableData,
            header: "Actions",
            sortable: false,
            cell: ({ row }: { row: any }) => (
              <div onClick={(e) => e.stopPropagation()}>
                <CellAction data={row.original} />
              </div>
            ),
          },
        ]
      : []),
  ];

  // Render expanded content for each row
  const renderExpandedContent = (hotel: HotelTableData) => (
    <div className="space-y-4">
      {/* Hotel Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Basic Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <HotelIcon className="h-4 w-4 mr-2" />
              Hotel Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            {hotel.hotel_address && (
              <div>
                <p className="text-muted-foreground mb-1">Address:</p>
                <p>{hotel.hotel_address}</p>
              </div>
            )}
            {hotel.hotel_phone && (
              <div>
                <p className="text-muted-foreground mb-1">Phone:</p>
                <p>{hotel.hotel_phone}</p>
              </div>
            )}
            {hotel.hotel_email && (
              <div>
                <p className="text-muted-foreground mb-1">Email:</p>
                <p>{hotel.hotel_email}</p>
              </div>
            )}
            {hotel.property_type && (
              <div>
                <p className="text-muted-foreground mb-1">Property Type:</p>
                <p>{hotel.property_type}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            {hotel.remarks && (
              <div>
                <p className="text-muted-foreground mb-1">Remarks:</p>
                <p>{hotel.remarks}</p>
              </div>
            )}
            {hotel.examples && (
              <div>
                <p className="text-muted-foreground mb-1">Examples:</p>
                <p>{hotel.examples}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotel Actions Card (for datastore) */}
        {isDatastore && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    // Add to selection
                    if (!selectedIds.includes(hotel.id)) {
                      onSelectionChange?.([...selectedIds, hotel.id]);
                    }
                  }}
                >
                  Add to Selection
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Room Categories & Pricing */}
      {hotel.rooms && hotel.rooms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Bed className="h-4 w-4 mr-2" />
              Room Categories & Pricing ({hotel.rooms.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {hotel.rooms.map((room, roomIndex) => (
                <div
                  key={roomIndex}
                  className="border rounded-lg p-4 bg-background"
                >
                  <div className="space-y-3">
                    {/* Room Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h5 className="font-medium text-base">
                          {room.room_category}
                        </h5>
                        {room.max_occupancy && (
                          <Badge variant="secondary">
                            Max: {room.max_occupancy}
                          </Badge>
                        )}
                        {room.meal_plan && (
                          <Badge variant="outline">{room.meal_plan}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Seasonal Pricing */}
                    {room.seasons && room.seasons.length > 0 ? (
                      <div className="space-y-3">
                        <h6 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Seasonal Pricing ({room.seasons.length} season
                          {room.seasons.length > 1 ? "s" : ""})
                        </h6>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {room.seasons.map((season, seasonIndex) => (
                            <div
                              key={seasonIndex}
                              className="bg-muted/30 rounded-lg p-3"
                            >
                              <div className="font-medium text-sm mb-2">
                                {season.dates || "Year Round"}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {season.rate_per_night && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Rate:
                                    </span>{" "}
                                    {season.rate_per_night}
                                  </div>
                                )}
                                {season.single_pp && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Single:
                                    </span>{" "}
                                    {season.single_pp}
                                  </div>
                                )}
                                {season.double_pp && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Double:
                                    </span>{" "}
                                    {season.double_pp}
                                  </div>
                                )}
                                {season.extra_bed_pp && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Extra:
                                    </span>{" "}
                                    {season.extra_bed_pp}
                                  </div>
                                )}
                                {season.child_no_bed && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Child:
                                    </span>{" "}
                                    {season.child_no_bed}
                                  </div>
                                )}
                              </div>

                              {/* Booking Offers */}
                              {season.booking_offers &&
                                season.booking_offers.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                                      <Tag className="h-3 w-3" />
                                      Booking Offers (
                                      {season.booking_offers.length})
                                    </div>
                                    <div className="space-y-2">
                                      {season.booking_offers.map(
                                        (offer, offerIndex) => (
                                          <div
                                            key={offerIndex}
                                            className="bg-background rounded p-2 text-xs space-y-1"
                                          >
                                            <div className="font-medium text-primary">
                                              {offer.offer_dates ||
                                                `Offer ${offerIndex + 1}`}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                                              {offer.rate_per_night && (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    Rate:
                                                  </span>{" "}
                                                  {offer.rate_per_night}
                                                </div>
                                              )}
                                              {offer.single_pp && (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    Single:
                                                  </span>{" "}
                                                  {offer.single_pp}
                                                </div>
                                              )}
                                              {offer.double_pp && (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    Double:
                                                  </span>{" "}
                                                  {offer.double_pp}
                                                </div>
                                              )}
                                              {offer.extra_bed_pp && (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    Extra:
                                                  </span>{" "}
                                                  {offer.extra_bed_pp}
                                                </div>
                                              )}
                                              {offer.child_no_bed && (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    Child:
                                                  </span>{" "}
                                                  {offer.child_no_bed}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Legacy pricing structure
                      ((room as any).rate_per_room_night ||
                        (room as any).single_pp ||
                        (room as any).double_pp) && (
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Pricing (Legacy)
                          </h6>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              {(room as any).rate_per_room_night && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Rate:
                                  </span>{" "}
                                  {(room as any).rate_per_room_night}
                                </div>
                              )}
                              {(room as any).single_pp && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Single:
                                  </span>{" "}
                                  {(room as any).single_pp}
                                </div>
                              )}
                              {(room as any).double_pp && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Double:
                                  </span>{" "}
                                  {(room as any).double_pp}
                                </div>
                              )}
                              {(room as any).extra_bed_pp && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Extra:
                                  </span>{" "}
                                  {(room as any).extra_bed_pp}
                                </div>
                              )}
                              {(room as any).child_no_bed && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Child:
                                  </span>{" "}
                                  {(room as any).child_no_bed}
                                </div>
                              )}
                            </div>
                            {(room as any).season_dates && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Season: {(room as any).season_dates}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}

                    {/* Other Details */}
                    {room.other_details && (
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">
                          Details:
                        </span>{" "}
                        {room.other_details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.length === hotels.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(hotels.map((h) => h.id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Selection controls for datastore */}
      {isDatastore && (
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={
                selectedIds.length === hotels.length && hotels.length > 0
              }
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} of {hotels.length} selected
            </span>
          </div>
        </div>
      )}

      <ExpandableDataTable
        data={tableData}
        columns={columns}
        renderExpandedContent={renderExpandedContent}
        searchColumn="hotel_name"
        searchPlaceholder="Search hotels..."
        title="Hotels"
        emptyMessage="No hotels found."
        showColumnVisibility={true}
        showPagination={true}
      />
    </div>
  );
}
