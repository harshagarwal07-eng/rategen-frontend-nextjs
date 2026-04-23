"use client";

import React from "react";
import ExpandableDataTable, {
  ExpandableTableColumn,
  BaseRowData,
} from "@/components/common/expandable-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Users, DollarSign } from "lucide-react";

// Tour data interface
export interface TourRowData extends BaseRowData {
  id: string;
  tour_name?: string;
  description?: string;
  duration?: string;
  max_participants?: number;
  city?: string;
  country?: string;
  preferred?: boolean;
  markup?: number;
  pvt_rate?: Record<string, number>;
  status?: "active" | "inactive" | "draft";
  created_at?: string;
  updated_at?: string;
}

interface ToursTableProps {
  tours: TourRowData[];
  onEdit?: (tourId: string) => void;
  onDelete?: (tourId: string) => void;
  onView?: (tourId: string) => void;
}

export default function ToursTable({
  tours,
  onEdit,
  onDelete,
  onView,
}: ToursTableProps) {
  // Define table columns
  const columns: ExpandableTableColumn<TourRowData>[] = [
    {
      id: "tour_name",
      accessorKey: "tour_name",
      header: "Tour Name",
      sortable: true,
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold">
            {row.original.tour_name || "Untitled Tour"}
          </div>
          {row.original.preferred && (
            <Badge variant="secondary" className="text-xs">
              Preferred
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "duration",
      accessorKey: "duration",
      header: "Duration",
      sortable: true,
      cell: ({ row }) => (
        <div className="text-center">{row.original.duration || "-"}</div>
      ),
    },
    {
      id: "max_participants",
      accessorKey: "max_participants",
      header: "Max Participants",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
          {row.original.max_participants || "-"}
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
      id: "private_rates",
      accessorKey: "pvt_rate",
      header: "Private Rates",
      sortable: false,
      cell: ({ row }) => {
        const count = Object.keys(row.original.pvt_rate || {}).length;
        return (
          <div className="flex items-center justify-center">
            <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
            <Badge variant={count > 0 ? "default" : "outline"}>
              {count} {count === 1 ? "rate" : "rates"}
            </Badge>
          </div>
        );
      },
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
  const renderExpandedContent = (tour: TourRowData) => (
    <div className="space-y-4">
      {/* Tour Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Basic Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            {tour.description && (
              <div>
                <p className="text-muted-foreground mb-1">Description:</p>
                <p className="text-sm">{tour.description}</p>
              </div>
            )}
            {tour.markup && (
              <div>
                <p className="text-muted-foreground mb-1">Markup:</p>
                <p className="font-medium">{tour.markup}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Private Rates Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Private Rates</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {Object.keys(tour.pvt_rate || {}).length > 0 ? (
              <div className="space-y-2 text-sm">
                {Object.entries(tour.pvt_rate || {}).map(([pax, rate]) => (
                  <div
                    key={pax}
                    className="flex justify-between py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="font-medium">{pax}</span>
                    <span>${rate.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No private rates configured
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
                  onClick={() => onView(tour.id)}
                  className="justify-start"
                >
                  View Details
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(tour.id)}
                  className="justify-start"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Tour
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(tour.id)}
                  className="justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tour
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <ExpandableDataTable
      data={tours}
      columns={columns}
      renderExpandedContent={renderExpandedContent}
      searchColumn="tour_name"
      searchPlaceholder="Search tours..."
      title="Tours"
      emptyMessage="No tours found. Create your first tour to get started."
      showColumnVisibility={true}
      showPagination={true}
    />
  );
}
