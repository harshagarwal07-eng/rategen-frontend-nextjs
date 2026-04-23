"use client";

import React from "react";
import ExpandableDataTable, {
  ExpandableTableColumn,
  BaseRowData,
} from "@/components/common/expandable-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISeason } from "@/components/forms/schemas/transfers-datastore-schema";

// Extend ISeason to include id for table
export interface SeasonRowData extends BaseRowData {
  id: string;
  dates?: string;
  sic_rate_adult?: number;
  sic_rate_child?: number;
  pvt_rate?: Record<string, number>;
  per_vehicle_rate?: Record<string, any>;
}

interface TransferSeasonsTableProps {
  seasons: ISeason[];
  onEdit?: (seasonId: string) => void;
  onDelete?: (seasonId: string) => void;
}

export default function TransferSeasonsTable({
  seasons,
}: TransferSeasonsTableProps) {
  // Convert seasons to table data with IDs
  const tableData: SeasonRowData[] = seasons.map((season, index) => ({
    ...season,
    id: `season-${index}`, // Generate ID for table
  }));

  // Define table columns
  const columns: ExpandableTableColumn<SeasonRowData>[] = [
    {
      id: "dates",
      accessorKey: "dates",
      header: "Season Name",
      sortable: true,
      cell: ({ row }) => (
        <div className="font-semibold">
          {row.original.dates || "Unnamed Season"}
        </div>
      ),
    },
    {
      id: "sic_adult",
      accessorKey: "sic_rate_adult",
      header: "SIC Adult",
      sortable: true,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.sic_rate_adult
            ? `$${row.original.sic_rate_adult.toFixed(2)}`
            : "-"}
        </div>
      ),
    },
    {
      id: "sic_child",
      accessorKey: "sic_rate_child",
      header: "SIC Child",
      sortable: true,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.sic_rate_child
            ? `$${row.original.sic_rate_child.toFixed(2)}`
            : "-"}
        </div>
      ),
    },
    {
      id: "private_rates_count",
      accessorKey: "pvt_rate",
      header: "Private Rates",
      sortable: false,
      cell: ({ row }) => {
        const count = Object.keys(row.original.pvt_rate || {}).length;
        return (
          <Badge variant={count > 0 ? "default" : "secondary"}>
            {count} {count === 1 ? "rate" : "rates"}
          </Badge>
        );
      },
    },
    {
      id: "vehicle_rates_count",
      accessorKey: "per_vehicle_rate",
      header: "Vehicle Rates",
      sortable: false,
      cell: ({ row }) => {
        const count = Object.keys(row.original.per_vehicle_rate || {}).length;
        return (
          <Badge variant={count > 0 ? "default" : "secondary"}>
            {count} {count === 1 ? "vehicle" : "vehicles"}
          </Badge>
        );
      },
    },
  ];

  // Render expanded content for each row
  const renderExpandedContent = (season: SeasonRowData) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Private Rates Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Private Rates</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {Object.keys(season.pvt_rate || {}).length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(season.pvt_rate || {}).map(([pax, rate]) => (
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

      {/* Vehicle Rates Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Per Vehicle Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {Object.keys(season.per_vehicle_rate || {}).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(season.per_vehicle_rate || {}).map(
                ([key, vehicle]) => (
                  <div key={key} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {vehicle.vehicle_type || "Vehicle"}
                          {vehicle.brand && ` - ${vehicle.brand}`}
                        </p>
                        {vehicle.capacity && (
                          <p className="text-xs text-muted-foreground">
                            Capacity: {vehicle.capacity}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold">
                        ${vehicle.rate?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No vehicle rates configured
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ExpandableDataTable
      data={tableData}
      columns={columns}
      renderExpandedContent={renderExpandedContent}
      searchColumn="dates"
      searchPlaceholder="Search seasons..."
      title="Transfer Seasons"
      emptyMessage="No seasons configured yet."
      showColumnVisibility={true}
      showPagination={false} // Disable pagination for seasons
    />
  );
}
