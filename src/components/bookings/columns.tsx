"use client";

import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getServiceTypeConfig,
  getBookingStatusConfig,
  getPaymentStatusConfig,
  getVoucherStatusConfig,
  SERVICE_TYPE_CONFIGS,
  BOOKING_STATUS_CONFIGS,
  PAYMENT_STATUS_CONFIGS,
  VOUCHER_STATUS_CONFIGS,
} from "@/lib/status-styles-config";
import type { BookingWithActivity } from "@/types/ops-bookings";
import type { ColumnDef, Column } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import * as React from "react";
import { toast } from "sonner";

import type { BookingStatus } from "@/types/ops-bookings";

// Combined statuses header with grouped filters across all 3 status columns
function StatusesColumnHeader({
  bookingColumn,
  paymentColumn,
  voucherColumn,
}: {
  bookingColumn: Column<BookingWithActivity, unknown> | undefined;
  paymentColumn: Column<BookingWithActivity, unknown> | undefined;
  voucherColumn: Column<BookingWithActivity, unknown> | undefined;
}) {
  const groups = [
    bookingColumn && {
      title: "Booking",
      column: bookingColumn,
      options: BOOKING_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value })),
    },
    paymentColumn && {
      title: "Payment",
      column: paymentColumn,
      options: PAYMENT_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value })),
    },
    voucherColumn && {
      title: "Voucher",
      column: voucherColumn,
      options: VOUCHER_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value })),
    },
  ].filter(Boolean) as React.ComponentProps<typeof DataTableColumnFilter>["groups"];

  return (
    <DataTableColumnFilter
      title="Statuses"
      enableSorting={false}
      enableFiltering={true}
      groups={groups}
    />
  );
}

function ghostColumn(id: string, accessorFn: (row: any) => string): ColumnDef<BookingWithActivity> {
  return {
    id,
    accessorFn,
    header: () => null,
    cell: () => null,
    enableColumnFilter: true,
    enableHiding: false,
    enableSorting: false,
    meta: { options: [] },
    size: 0,
    filterFn: (row, columnId, value) => value.includes(row.getValue(columnId)),
  };
}

interface GenerateBookingsColumnsOptions {
  onViewBooking?: (booking: BookingWithActivity) => void;
  onEditBooking?: (booking: BookingWithActivity) => void;
  onDeleteBooking?: (booking: BookingWithActivity) => void;
  onStatusChange?: (bookingId: string, newStatus: BookingStatus) => void;
  onFetchCountries?: (query: string) => Promise<{ label: string; value: string }[]>;
  onFetchAgencies?: (query: string) => Promise<{ label: string; value: string }[]>;
}

export function generateBookingsColumns(
  options: GenerateBookingsColumnsOptions = {}
): ColumnDef<BookingWithActivity>[] {
  const { onViewBooking, onEditBooking, onDeleteBooking, onStatusChange, onFetchCountries, onFetchAgencies } = options;

  return [
    {
      id: "query_id",
      accessorFn: (row: any) => row.short_query_id || "",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Query ID" enableFiltering={false} />,
      cell: ({ row }) => {
        const rowData = row.original as any;
        const shortQueryId = rowData.short_query_id || "";
        const queryId = rowData.query_id || "";

        return (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs font-medium">{shortQueryId}</span>
            {queryId && (
              <Link
                href={`/crm/queries/all/${queryId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        );
      },
      enablePinning: true,
      enableSorting: true,
      size: 120,
    },
    {
      id: "service",
      accessorFn: (row: any) => row.service_name || "Unknown",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Service" enableFiltering={false} />,
      cell: ({ row }) => {
        const serviceName = (row.original as any).service_name || "Unknown";
        return <div className="font-medium text-xs break-words max-w-[240px]">{serviceName}</div>;
      },
      enablePinning: true,
      enableSorting: true,
      size: 240,
    },
    {
      id: "lead_pax",
      accessorFn: (row: any) => row.traveler_name || "",
      header: ({ column, table }) => {
        const agencyColumn = table.getColumn("agency");
        if (agencyColumn && onFetchAgencies) {
          return (
            <DataTableColumnFilter
              column={column}
              title="Lead Pax"
              enableSorting={true}
              enableFiltering={true}
              groups={[{ title: "Agency", column: agencyColumn, onSearch: onFetchAgencies }]}
            />
          );
        }
        return <DataTableColumnFilter column={column} title="Lead Pax" enableFiltering={false} />;
      },
      cell: ({ row }) => {
        const rowData = row.original as any;
        const travelerName = rowData.traveler_name || "-";
        const dayNumber = rowData.day_number;
        const agencyName = rowData.agency_name;

        return (
          <div className="flex flex-col gap-1.5 max-w-[200px] ml-2">
            <span className="font-medium text-xs break-words">{travelerName}</span>
            <div className="flex items-center gap-1.5">
              {dayNumber && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0">
                  Day {dayNumber}
                </Badge>
              )}
              {agencyName && <span className="text-xs text-muted-foreground break-words">{agencyName}</span>}
            </div>
          </div>
        );
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "service_type",
      accessorFn: (row: any) => row.service_type,
      header: ({ column }) => (
        <DataTableColumnFilter
          column={column}
          title="Type"
          options={SERVICE_TYPE_CONFIGS.map((config) => ({
            label: config.label,
            value: config.value,
          }))}
        />
      ),
      meta: { options: [] },
      cell: ({ row }) => {
        const serviceType = (row.original as any).service_type;
        const config = getServiceTypeConfig(serviceType);

        return (
          <Badge variant="outline" className={`text-xs ${config.bgColor} ${config.color} border-0`}>
            {config.label}
          </Badge>
        );
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 100,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "supplier",
      accessorFn: (row: any) => row.supplier_name || "Not Assigned",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Supplier" enableFiltering={false} />,
      cell: ({ row }) => {
        const supplierName = (row.original as any).supplier_name;
        return <div className="text-xs">{supplierName || <span className="text-muted-foreground">-</span>}</div>;
      },
      enableSorting: true,
      size: 160,
    },
    {
      id: "start_date",
      accessorFn: (row: any) => {
        return row.check_in_date || row.tour_date || row.pickup_date || null;
      },
      header: ({ column }) => <DataTableColumnFilter column={column} title="Dates" enableFiltering={false} />,
      cell: ({ row }) => {
        const rowData = row.original as any;
        const serviceType = rowData.service_type;

        let lines: { label: string; date: string | null }[] = [];

        if (serviceType === "hotel") {
          lines = [
            { label: "Check in", date: rowData.check_in_date },
            { label: "Check out", date: rowData.check_out_date },
          ];
        } else if (serviceType === "transfer") {
          lines = [
            { label: "Pick up", date: rowData.pickup_date },
            { label: "Drop off", date: rowData.drop_date },
          ];
        } else if (serviceType === "tour") {
          lines = [{ label: "Tour date", date: rowData.tour_date }];
        } else {
          const startDate = rowData.check_in_date || rowData.tour_date || rowData.pickup_date;
          const endDate = rowData.check_out_date || rowData.drop_date;
          lines = [
            { label: "Start date", date: startDate },
            { label: "End date", date: endDate },
          ];
        }

        const hasAnyDate = lines.some((l) => l.date);
        if (!hasAnyDate) return <span className="text-muted-foreground">-</span>;

        return (
          <div className="flex flex-col gap-0.5">
            {lines.map(({ label, date }) =>
              date ? (
                <div key={label} className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                  <span className="text-muted-foreground w-[52px] shrink-0">{label}:</span>
                  <span>{format(new Date(date), "dd MMM yyyy")}</span>
                </div>
              ) : null
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 160,
    },
    {
      id: "country",
      accessorFn: (row: any) => row.service_country || "",
      header: ({ column }) => (
        <DataTableColumnFilter
          column={column}
          title="Destination"
          groups={[
            {
              title: "Country",
              column: column,
              ...(onFetchCountries && { onSearch: onFetchCountries }),
            },
          ]}
        />
      ),
      cell: ({ row }) => {
        const rowData = row.original as any;
        const country = rowData.service_country;
        const city = rowData.service_city;
        if (!country && !city) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {country && (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                <span className="text-muted-foreground w-[44px] shrink-0">Country:</span>
                <span>{country}</span>
              </div>
            )}
            {city && (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                <span className="text-muted-foreground w-[44px] shrink-0">City:</span>
                <span>{city}</span>
              </div>
            )}
          </div>
        );
      },
      meta: { options: [] },
      enableColumnFilter: true,
      enableSorting: true,
      size: 190,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    ghostColumn("city", (row) => row.service_city || ""),
    ghostColumn("agency", (row) => row.agency_name || ""),
    {
      id: "vehicle",
      accessorFn: (row: any) => row.vehicle_number || "",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Vehicle" enableFiltering={false} />,
      cell: ({ row }) => {
        const { vehicle_number, vehicle_type, vehicle_brand } = row.original as any;
        if (!vehicle_number && !vehicle_type && !vehicle_brand)
          return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {vehicle_number && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground w-[36px] shrink-0">No:</span>
                <span className="font-mono font-medium">{vehicle_number}</span>
              </div>
            )}
            {vehicle_type && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground w-[36px] shrink-0">Type:</span>
                <span>{vehicle_type}</span>
              </div>
            )}
            {vehicle_brand && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground w-[36px] shrink-0">Brand:</span>
                <span>{vehicle_brand}</span>
              </div>
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "driver",
      accessorFn: (row: any) => row.driver_name || "",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Driver" enableFiltering={false} />,
      cell: ({ row }) => {
        const { driver_name, driver_phone, driver_whatsapp } = row.original as any;
        if (!driver_name && !driver_phone)
          return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {driver_name && <div className="text-xs font-medium">{driver_name}</div>}
            {(driver_phone || driver_whatsapp) && (
              <div className="text-xs text-muted-foreground">{driver_phone || driver_whatsapp}</div>
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "restaurant",
      accessorFn: (row: any) => row.restaurant_name || "",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Restaurant" enableFiltering={false} />,
      cell: ({ row }) => {
        const { restaurant_name, restaurant_poc_name, restaurant_phone } = row.original as any;
        if (!restaurant_name)
          return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {restaurant_name && <div className="text-xs font-medium">{restaurant_name}</div>}
            {restaurant_poc_name && <div className="text-xs text-muted-foreground">{restaurant_poc_name}</div>}
            {restaurant_phone && <div className="text-xs text-muted-foreground">{restaurant_phone}</div>}
          </div>
        );
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "guide",
      accessorFn: (row: any) => row.guide_name || "",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Guide" enableFiltering={false} />,
      cell: ({ row }) => {
        const { guide_name, guide_phone, guide_whatsapp } = row.original as any;
        if (!guide_name)
          return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {guide_name && <div className="text-xs font-medium">{guide_name}</div>}
            {(guide_phone || guide_whatsapp) && (
              <div className="text-xs text-muted-foreground">{guide_phone || guide_whatsapp}</div>
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 150,
    },
    {
      id: "booking_status",
      accessorKey: "booking_status",
      header: ({ table }) => {
        const bookingColumn = table.getColumn("booking_status");
        const paymentColumn = table.getColumn("payment_status");
        const voucherColumn = table.getColumn("voucher_status");
        return (
          <StatusesColumnHeader
            bookingColumn={bookingColumn}
            paymentColumn={paymentColumn}
            voucherColumn={voucherColumn}
          />
        );
      },
      cell: ({ row }) => {
        const rowData = row.original as any;
        const bookingStatus = rowData.booking_status;
        const paymentStatus = rowData.derived_payment_status || "not_configured";
        const voucherStatus = rowData.voucher_status;

        const bookingConfig = getBookingStatusConfig(bookingStatus);
        const paymentConfig = getPaymentStatusConfig(paymentStatus);
        const voucherConfig = getVoucherStatusConfig(voucherStatus);

        return (
          <div className="flex flex-col gap-1">
            {/* Booking — changeable */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs w-[52px] shrink-0">Booking</span>
              <Select
                value={bookingStatus}
                onValueChange={(value) => {
                  if (value === "confirmed" && !rowData.payment_plan_id) {
                    toast.error("Payment must be configured before confirming a booking.");
                    return;
                  }
                  onStatusChange?.(rowData.id, value as BookingStatus);
                }}
              >
                <SelectTrigger
                  size="xs"
                  className={cn(
                    "!w-fit !h-auto !px-0 !py-0.5 !border-transparent !shadow-none !text-xs !font-medium !rounded-md gap-1 !bg-transparent [&_svg:not([class*='text-'])]:!text-current [&_svg:not([class*='size-'])]:!size-2.5 cursor-pointer hover:opacity-80",
                    bookingConfig.color
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {bookingConfig.label}
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUS_CONFIGS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", s.dotColor)} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Payment — read-only */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs w-[52px] shrink-0">Payment</span>
              <span className={cn("text-xs font-medium", paymentConfig.color)}>{paymentConfig.label}</span>
            </div>
            {/* Voucher — read-only */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs w-[52px] shrink-0">Voucher</span>
              <span className={cn("text-xs font-medium", voucherConfig.color)}>{voucherConfig.label}</span>
            </div>
          </div>
        );
      },
      enableColumnFilter: true,
      enableSorting: true,
      meta: { options: [] },
      size: 170,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    // Hidden columns — filter driven from header via StatusesColumnHeader
    ghostColumn("payment_status", (row) => row.derived_payment_status || "not_configured"),
    ghostColumn("voucher_status", (row) => row.voucher_status || ""),
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const booking = row.original;
        const canDelete = !booking.payment_plan_id;

        return (
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onViewBooking?.(booking);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBooking?.(booking);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBooking?.(booking);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete Booking
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enablePinning: true,
      enableSorting: false,
      enableHiding: false,
      size: 72,
    },
  ];
}
