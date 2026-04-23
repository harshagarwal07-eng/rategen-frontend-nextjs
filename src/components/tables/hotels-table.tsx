"use client";

import React from "react";
import ExpandableDataTable, {
  ExpandableTableColumn,
  BaseRowData,
} from "@/components/common/expandable-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Star, Bed, Calendar } from "lucide-react";

// Hotel room interface for nested data
export interface HotelRoom {
  room_category: string;
  max_occupancy?: string;
  meal_plan?: string;
  other_details?: string;
  seasons: {
    dates: string;
    rate_per_night?: number;
    single_pp?: number;
    double_pp?: number;
    extra_bed_pp?: number;
    child_no_bed?: number;
  }[];
}

// Hotel data interface
export interface HotelRowData extends BaseRowData {
  id: string;
  hotel_name?: string;
  description?: string;
  star_rating?: number;
  city?: string;
  country?: string;
  preferred?: boolean;
  markup?: number;
  rooms?: HotelRoom[];
  status?: "active" | "inactive" | "draft";
  total_rooms?: number;
  created_at?: string;
  updated_at?: string;
}

interface HotelsTableProps {
  hotels: HotelRowData[];
  onEdit?: (hotelId: string) => void;
  onDelete?: (hotelId: string) => void;
  onView?: (hotelId: string) => void;
}

export default function HotelsTable({
  hotels,
  onEdit,
  onDelete,
  onView,
}: HotelsTableProps) {
  // Define table columns
  const columns: ExpandableTableColumn<HotelRowData>[] = [
    {
      id: "hotel_name",
      accessorKey: "hotel_name",
      header: "Hotel Name",
      sortable: true,
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold">
            {row.original.hotel_name || "Untitled Hotel"}
          </div>
          <div className="flex items-center gap-2">
            {row.original.preferred && (
              <Badge variant="secondary" className="text-xs">
                Preferred
              </Badge>
            )}
            {row.original.star_rating && (
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground ml-1">
                  {row.original.star_rating}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "location",
      accessorKey: "city",
      header: "Location",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
          <span className="text-sm">
            {row.original.city || row.original.country || "Not specified"}
          </span>
        </div>
      ),
    },
    {
      id: "rooms_count",
      accessorKey: "rooms",
      header: "Room Categories",
      sortable: false,
      cell: ({ row }) => {
        const count = row.original.rooms?.length || 0;
        return (
          <div className="flex items-center justify-center">
            <Bed className="h-4 w-4 mr-1 text-muted-foreground" />
            <Badge variant={count > 0 ? "default" : "outline"}>
              {count} {count === 1 ? "category" : "categories"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "seasons_count",
      accessorKey: "rooms",
      header: "Seasons",
      sortable: false,
      cell: ({ row }) => {
        const totalSeasons =
          row.original.rooms?.reduce(
            (total, room) => total + (room.seasons?.length || 0),
            0
          ) || 0;
        return (
          <div className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
            <Badge variant={totalSeasons > 0 ? "default" : "outline"}>
              {totalSeasons} {totalSeasons === 1 ? "season" : "seasons"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "markup",
      accessorKey: "markup",
      header: "Markup",
      sortable: true,
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {row.original.markup ? `${row.original.markup}%` : "-"}
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      sortable: true,
      cell: ({ row }) => {
        const status = row.original.status || "draft";
        const variant =
          status === "active"
            ? "default"
            : status === "inactive"
            ? "secondary"
            : "outline";
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
  ];

  // Render expanded content for each row
  const renderExpandedContent = (hotel: HotelRowData) => (
    <div className="space-y-4">
      {/* Hotel Basic Info */}
      {hotel.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{hotel.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Room Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Bed className="h-4 w-4 mr-2" />
              Room Categories ({hotel.rooms?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {hotel.rooms && hotel.rooms.length > 0 ? (
              <div className="space-y-3">
                {hotel.rooms.map((room, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {room.room_category}
                        </p>
                        {room.max_occupancy && (
                          <p className="text-xs text-muted-foreground">
                            Max Occupancy: {room.max_occupancy}
                          </p>
                        )}
                        {room.meal_plan && (
                          <p className="text-xs text-muted-foreground">
                            Meal Plan: {room.meal_plan}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {room.seasons?.length || 0} seasons
                      </Badge>
                    </div>
                    {room.other_details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {room.other_details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No room categories configured
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-2">
              {onView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(hotel.id)}
                  className="justify-start"
                >
                  View Details
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(hotel.id)}
                  className="justify-start"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Hotel
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(hotel.id)}
                  className="justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Hotel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seasonal Pricing Details */}
      {hotel.rooms &&
        hotel.rooms.some((room) => room.seasons && room.seasons.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Seasonal Pricing Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {hotel.rooms?.map(
                  (room, roomIndex) =>
                    room.seasons &&
                    room.seasons.length > 0 && (
                      <div
                        key={roomIndex}
                        className="border-l-2 border-border pl-3"
                      >
                        <h4 className="font-medium text-sm mb-2">
                          {room.room_category}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {room.seasons.map((season, seasonIndex) => (
                            <div
                              key={seasonIndex}
                              className="p-2 bg-muted/30 rounded"
                            >
                              <p className="font-medium">{season.dates}</p>
                              {season.rate_per_night && (
                                <p className="text-muted-foreground">
                                  Rate: ${season.rate_per_night}/night
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );

  return (
    <ExpandableDataTable
      data={hotels}
      columns={columns}
      renderExpandedContent={renderExpandedContent}
      searchColumn="hotel_name"
      searchPlaceholder="Search hotels..."
      title="Hotels"
      emptyMessage="No hotels found. Add your first hotel to get started."
      showColumnVisibility={true}
      showPagination={true}
    />
  );
}
