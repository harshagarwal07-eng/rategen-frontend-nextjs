"use client";

import { useNewTable } from "@/hooks/use-new-table";
import { parseAsInteger, useQueryState, useQueryStates } from "nuqs";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import { generateBookingsColumns } from "./columns";
import type { BookingWithActivity } from "@/types/ops-bookings";
import { BookingDetailsSheet } from "./calendar/booking-details-sheet";
import { AlertModal } from "@/components/ui/alert-modal";
import { useState, useEffect, useMemo } from "react";
import { fetchAgencies } from "@/data-access/bookings";
import { fetchCountries } from "@/data-access/datastore";
import { deleteBooking, updateBookingStatus } from "@/data-access/bookings";
import { toast } from "sonner";
import type { BookingStatus } from "@/types/ops-bookings";
import { useRouter } from "next/navigation";
import BookingFormOrchestrator from "@/components/forms/ops-forms/booking-form-orchestrator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { bookingsSearchParams } from "./bookings-searchparams";

interface BookingsTableViewProps {
  data: { data: BookingWithActivity[]; totalItems: number };
}

export function BookingsTableView({ data }: BookingsTableViewProps) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithActivity | null>(null);
  const [editingBooking, setEditingBooking] = useState<BookingWithActivity | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<BookingWithActivity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Date range filter
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [{ start_date, end_date, booking_status, payment_status, voucher_status, supplier, country, city, agency }, setAllParams] = useQueryStates(
    {
      start_date: bookingsSearchParams.start_date,
      end_date: bookingsSearchParams.end_date,
      booking_status: bookingsSearchParams.booking_status,
      payment_status: bookingsSearchParams.payment_status,
      voucher_status: bookingsSearchParams.voucher_status,
      supplier: bookingsSearchParams.supplier,
      country: bookingsSearchParams.country,
      city: bookingsSearchParams.city,
      agency: bookingsSearchParams.agency,
    },
    { shallow: false }
  );

  const [search, setSearch] = useQueryState("search", { defaultValue: "", shallow: false });

  const setDateParams = (params: { start_date: string | null; end_date: string | null }) =>
    setAllParams(params);

  const hasActiveFilters =
    !!start_date || !!end_date || !!search ||
    booking_status.length > 0 || payment_status.length > 0 || voucher_status.length > 0 ||
    supplier.length > 0 || country.length > 0 || city.length > 0 || agency.length > 0;

  const handleResetAll = () => {
    setAllParams({
      start_date: null, end_date: null,
      booking_status: [], payment_status: [], voucher_status: [],
      supplier: [], country: [], city: [], agency: [],
    });
    setSearch(null);
    setPendingDateRange(undefined);
  };
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(
    start_date || end_date
      ? { from: start_date ? new Date(start_date) : undefined, to: end_date ? new Date(end_date) : undefined }
      : undefined
  );

  const handleDateApply = () => {
    setDateParams({
      start_date: pendingDateRange?.from ? format(pendingDateRange.from, "yyyy-MM-dd") : null,
      end_date: pendingDateRange?.to ? format(pendingDateRange.to, "yyyy-MM-dd") : null,
    });
    setDatePopoverOpen(false);
  };

  const handleDateClear = () => {
    setPendingDateRange(undefined);
    setDateParams({ start_date: null, end_date: null });
    setDatePopoverOpen(false);
  };

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    const result = await updateBookingStatus(bookingId, newStatus);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Booking status updated successfully");
    router.refresh();
  };

  const hasVehicle = useMemo(() => data.data.some((b) => !!b.vehicle_id), [data.data]);
  const hasDriver = useMemo(() => data.data.some((b) => !!b.driver_id), [data.data]);
  const hasRestaurant = useMemo(() => data.data.some((b) => !!b.restaurant_id), [data.data]);
  const hasGuide = useMemo(() => data.data.some((b) => !!b.guide_id), [data.data]);

  const columns = generateBookingsColumns({
    onViewBooking: setSelectedBooking,
    onEditBooking: setEditingBooking,
    onDeleteBooking: setDeletingBooking,
    onStatusChange: handleStatusChange,
    onFetchCountries: async (search) => {
      const results = await fetchCountries(search);
      return results.map((r) => ({ label: r.label, value: r.label }));
    },
    onFetchAgencies: fetchAgencies,
  });

  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(50));
  const pageCount = Math.ceil(data.totalItems / pageSize);

  const { table } = useNewTable({
    data: data.data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    enableRowSelection: false,
    initialState: {
      columnPinning: {
        left: ["query_id", "service"],
        right: ["actions"],
      },
      columnVisibility: {
        agency: false,
        city: false,
        payment_status: false,
        voucher_status: false,
        vehicle: hasVehicle,
        driver: hasDriver,
        restaurant: hasRestaurant,
        guide: hasGuide,
      },
      sorting: [{ id: "start_date", desc: false }] as any,
    },
  });

  useEffect(() => {
    table.setColumnVisibility((prev) => ({
      ...prev,
      vehicle: hasVehicle,
      driver: hasDriver,
      restaurant: hasRestaurant,
      guide: hasGuide,
    }));
  }, [hasVehicle, hasDriver, hasRestaurant, hasGuide]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteBooking = async () => {
    if (!deletingBooking) return;
    setIsDeleting(true);
    const result = await deleteBooking(deletingBooking.id);
    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }
    toast.success("Booking deleted successfully");
    setIsDeleting(false);
    setDeletingBooking(null);
    router.refresh();
  };

  return (
    <>
      <DataTableWrapper
        table={table}
        searchableColumns={["query_id", "service", "supplier", "lead_pax"]}
        searchPlaceholder="Search by ID, Service, Supplier, Lead Pax..."
        showSearch={true}
        showViewOptions={true}
        showPagination={true}
        emptyMessage="No bookings found."
        onReset={handleResetAll}
        hasFilters={hasActiveFilters}
        toolbarActions={
          <>
            {/* Date Range Picker — sits just before the view options button */}
            <Popover
              open={datePopoverOpen}
              onOpenChange={(open) => {
                if (open) {
                  setPendingDateRange(
                    start_date || end_date
                      ? {
                          from: start_date ? new Date(start_date) : undefined,
                          to: end_date ? new Date(end_date) : undefined,
                        }
                      : undefined
                  );
                }
                setDatePopoverOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs border-dashed">
                  <CalendarIcon className="size-3.5" />
                  {start_date && end_date
                    ? `${format(new Date(start_date), "dd MMM ''yy")} – ${format(new Date(end_date), "dd MMM ''yy")}`
                    : start_date
                      ? `From ${format(new Date(start_date), "dd MMM ''yy")}`
                      : "Date Range"}
                  {(start_date || end_date) && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDateClear();
                      }}
                      className="focus-visible:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:outline-none"
                    >
                      <X className="size-4" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Filter by Date Range</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Filter bookings by service start date</p>
                </div>
                <Calendar
                  mode="range"
                  selected={pendingDateRange}
                  onSelect={setPendingDateRange}
                  numberOfMonths={2}
                  defaultMonth={pendingDateRange?.from}
                />
                <div className="p-3 border-t flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleDateClear}>
                    Clear
                  </Button>
                  <Button size="sm" className="flex-1" onClick={handleDateApply} disabled={!pendingDateRange?.from}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </>
        }
      />

      {selectedBooking && (
        <BookingDetailsSheet
          isOpen={!!selectedBooking}
          onOpenChange={(open) => !open && setSelectedBooking(null)}
          bookings={[selectedBooking]}
          expandSupplierContacts
        />
      )}

      {editingBooking && (
        <BookingFormOrchestrator
          isOpen={!!editingBooking}
          queryId={editingBooking.query_id}
          activityId={editingBooking.itinerary_id}
          bookingId={editingBooking.id}
          onClose={() => setEditingBooking(null)}
          onSuccess={() => {
            setEditingBooking(null);
            router.refresh();
          }}
        />
      )}

      <AlertModal
        isOpen={!!deletingBooking}
        onClose={() => setDeletingBooking(null)}
        onConfirm={handleDeleteBooking}
        loading={isDeleting}
        title="Delete Booking"
        description="Are you sure you want to delete this booking? This action cannot be undone."
      />
    </>
  );
}
