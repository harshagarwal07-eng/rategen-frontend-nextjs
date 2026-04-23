"use client";

import { useState, useMemo } from "react";
import { MoreHorizontal, Pencil, FileText, X, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateBookingStatus, deleteBooking } from "@/data-access/bookings";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AlertModal } from "@/components/ui/alert-modal";
import { BookingTableRow, BookingStatus } from "@/types/ops-bookings";
import {
  getServiceTypeConfig,
  getBookingStatusConfig,
  getPaymentStatusConfig,
  getVoucherStatusConfig,
  BOOKING_STATUS_CONFIGS,
} from "@/lib/status-styles-config";
import BookingFormOrchestrator from "@/components/forms/ops-forms/booking-form-orchestrator";
import { ServiceType } from "@/data-access/itinerary-activities";
import { ColumnFilter } from "./column-filter";

const CATEGORY_CONFIG: Record<string, { label: string; types: ServiceType[] }> = {
  all: { label: "All", types: [] },
  hotel: { label: "Hotels", types: ["hotel"] },
  tour: { label: "Tours", types: ["tour"] },
  transfer: { label: "Transfers", types: ["transfer"] },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

interface BookingsTableContentProps {
  bookings: BookingTableRow[];
  activeTab: string;
  queryId: string;
}

export function BookingsTableContent({ bookings, activeTab, queryId }: BookingsTableContentProps) {
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [bookingStatusFilter, setBookingStatusFilter] = useState<Set<string>>(new Set());
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<Set<string>>(new Set());
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<Set<string>>(new Set());

  const [editingBooking, setEditingBooking] = useState<{
    bookingId: string;
    activityId: string;
  } | null>(null);

  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filterOptions = useMemo(() => {
    const types = [...new Set(bookings.map((b) => b.service_type))].map((t) => ({
      label: CATEGORY_CONFIG[t]?.label || t,
      value: t,
    }));

    const bookingStatuses = [...new Set(bookings.map((b) => b.booking_status))].map((s) => ({
      label: getBookingStatusConfig(s).label,
      value: s,
    }));

    const paymentStatuses = [...new Set(bookings.map((b) => b.payment_status))].map((s) => ({
      label: getPaymentStatusConfig(s).label,
      value: s,
    }));

    const voucherStatuses = [...new Set(bookings.map((b) => b.voucher_status))].map((s) => ({
      label: getVoucherStatusConfig(s).label,
      value: s,
    }));

    return { types, bookingStatuses, paymentStatuses, voucherStatuses };
  }, [bookings]);

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const hasActiveFilters =
    typeFilter.size > 0 || bookingStatusFilter.size > 0 || paymentStatusFilter.size > 0 || voucherStatusFilter.size > 0;

  const clearAllFilters = () => {
    setTypeFilter(new Set());
    setBookingStatusFilter(new Set());
    setPaymentStatusFilter(new Set());
    setVoucherStatusFilter(new Set());
  };

  const handleBookingStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    const result = await updateBookingStatus(bookingId, newStatus);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Booking status updated successfully");
    queryClient.invalidateQueries({ queryKey: ["query-bookings", queryId] });
  };

  const handleDeleteBooking = async () => {
    if (!deletingBookingId) return;

    setIsDeleting(true);
    const result = await deleteBooking(deletingBookingId);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }

    toast.success("Booking deleted successfully");
    queryClient.invalidateQueries({ queryKey: ["query-bookings", queryId] });
    setIsDeleting(false);
    setDeletingBookingId(null);
  };

  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    if (activeTab !== "all") {
      const types = CATEGORY_CONFIG[activeTab]?.types || [];
      filtered = filtered.filter((b) => types.includes(b.service_type));
    }

    if (typeFilter.size > 0) {
      filtered = filtered.filter((b) => typeFilter.has(b.service_type));
    }

    if (bookingStatusFilter.size > 0) {
      filtered = filtered.filter((b) => bookingStatusFilter.has(b.booking_status));
    }

    if (paymentStatusFilter.size > 0) {
      filtered = filtered.filter((b) => paymentStatusFilter.has(b.payment_status));
    }

    if (voucherStatusFilter.size > 0) {
      filtered = filtered.filter((b) => voucherStatusFilter.has(b.voucher_status));
    }

    return filtered;
  }, [bookings, activeTab, typeFilter, bookingStatusFilter, paymentStatusFilter, voucherStatusFilter]);

  const tabTotal = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + b.amount, 0);
  }, [filteredBookings]);

  const currency = bookings[0]?.currency || "USD";

  return (
    <>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex gap-2 items-center">
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  Showing {filteredBookings.length} of {bookings.length} items
                </span>
                <Button variant="secondary" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>
                  <X className="size-3" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="min-w-[180px]">Service Name</TableHead>
                <TableHead className="min-w-[140px]">Supplier Name</TableHead>
                <TableHead className="w-28">
                  <ColumnFilter
                    title="Type"
                    options={filterOptions.types}
                    selected={typeFilter}
                    onSelect={(v) => toggleFilter(setTypeFilter, v)}
                    onClear={() => setTypeFilter(new Set())}
                  />
                </TableHead>
                <TableHead className="w-28">Start Date</TableHead>
                <TableHead className="w-28">End Date</TableHead>
                <TableHead className="text-right w-28">Amount</TableHead>
                <TableHead className="w-32">
                  <ColumnFilter
                    title="Booking"
                    options={filterOptions.bookingStatuses}
                    selected={bookingStatusFilter}
                    onSelect={(v) => toggleFilter(setBookingStatusFilter, v)}
                    onClear={() => setBookingStatusFilter(new Set())}
                  />
                </TableHead>
                <TableHead className="w-32">
                  <ColumnFilter
                    title="Payment"
                    options={filterOptions.paymentStatuses}
                    selected={paymentStatusFilter}
                    onSelect={(v) => toggleFilter(setPaymentStatusFilter, v)}
                    onClear={() => setPaymentStatusFilter(new Set())}
                  />
                </TableHead>
                <TableHead className="w-32">
                  <ColumnFilter
                    title="Voucher"
                    options={filterOptions.voucherStatuses}
                    selected={voucherStatusFilter}
                    onSelect={(v) => toggleFilter(setVoucherStatusFilter, v)}
                    onClear={() => setVoucherStatusFilter(new Set())}
                  />
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-muted/30">
                  <TableCell>
                    <p className="font-medium text-xs leading-tight">{booking.service_name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">{booking.supplier_name || "-"}</p>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const config = getServiceTypeConfig(booking.service_type);
                      return (
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(booking.start_date)}</TableCell>
                  <TableCell className="text-xs">{formatDate(booking.end_date)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-medium">
                    {formatCurrency(booking.amount)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const config = getBookingStatusConfig(booking.booking_status);
                      return (
                        <Select
                          value={booking.booking_status}
                          onValueChange={(value) => {
                            if (value === "confirmed" && booking.payment_status === "not_configured") {
                              toast.error("Payment must be configured before confirming a booking.");
                              return;
                            }
                            handleBookingStatusChange(booking.id, value as BookingStatus);
                          }}
                        >
                          <SelectTrigger
                            size="xs"
                            className={cn(
                              "!w-fit !h-auto !px-1.5 !py-0.5 !border-transparent !shadow-none !text-[10px] !font-medium !rounded-md gap-1 [&_svg:not([class*='text-'])]:!text-current [&_svg:not([class*='size-'])]:!size-2.5 cursor-pointer hover:opacity-80",
                              config.color,
                              config.bgColor
                            )}
                          >
                            {config.label}
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
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const config = getPaymentStatusConfig(booking.payment_status);
                      return (
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const config = getVoucherStatusConfig(booking.voucher_status);
                      return (
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="p-1">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setEditingBooking({
                              bookingId: booking.id,
                              activityId: booking.itinerary_id,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {booking.voucher_status === "vouchered" && (
                          <DropdownMenuItem>
                            <FileText className="h-3.5 w-3.5 mr-2" />
                            View Voucher
                          </DropdownMenuItem>
                        )}
                        {booking.payment_status === "not_configured" && (
                          <DropdownMenuItem
                            onClick={() => setDeletingBookingId(booking.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete Booking
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell className="text-xs">Total ({filteredBookings.length} items)</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {currency} {formatCurrency(tabTotal)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {editingBooking && (
        <BookingFormOrchestrator
          isOpen={!!editingBooking}
          queryId={queryId}
          activityId={editingBooking.activityId}
          bookingId={editingBooking.bookingId}
          onClose={() => setEditingBooking(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["query-bookings", queryId] });
            setEditingBooking(null);
          }}
        />
      )}

      <AlertModal
        isOpen={!!deletingBookingId}
        onClose={() => setDeletingBookingId(null)}
        onConfirm={handleDeleteBooking}
        loading={isDeleting}
        title="Delete Booking"
        description="Are you sure you want to delete this booking? This action cannot be undone."
      />
    </>
  );
}
