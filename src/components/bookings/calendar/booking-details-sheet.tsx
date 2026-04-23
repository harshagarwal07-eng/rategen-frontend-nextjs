"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  getBookingStatusConfig,
  getPaymentStatusConfig,
  getServiceTypeConfig,
  getVoucherStatusConfig,
} from "@/lib/status-styles-config";
import type { BookingWithActivity, CalendarBooking } from "@/types/ops-bookings";
import {
  Calendar,
  MapPin,
  Building2,
  Car,
  UserRound,
  UtensilsCrossed,
  BookUser,
  Phone,
  MessageCircle,
  CreditCard,
  Hash,
  Info,
  FileCheck,
  Mail,
  Landmark,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

type AnyBooking = BookingWithActivity | CalendarBooking;

interface BookingDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: AnyBooking[];
  expandSupplierContacts?: boolean;
}

// Safely extract a flat field from a booking (works for both types)
function field<T>(b: any, ...keys: string[]): T | null {
  for (const key of keys) {
    const val = b[key];
    if (val !== null && val !== undefined && val !== "") return val as T;
  }
  return null;
}

export function BookingDetailsSheet({
  isOpen,
  onOpenChange,
  bookings,
  expandSupplierContacts,
}: BookingDetailsSheetProps) {
  if (!bookings.length) return null;

  const b0 = bookings[0] as any;

  const travelerName = field<string>(b0, "traveler_name") ?? "Traveler";
  const shortQueryId = field<string>(b0, "short_query_id") ?? "";
  const agencyName = field<string>(b0, "agency_name");
  const agencyAdminName = field<string>(b0, "agency_admin_name");
  const agencyAdminEmail = field<string>(b0, "agency_admin_email");
  const agencyAdminPhone = field<string>(b0, "agency_admin_phone");
  const paxDetails = b0.pax_details ?? null;

  const paxLabel = (() => {
    if (!paxDetails) return null;
    const parts: string[] = [];
    if (paxDetails.adults) parts.push(`${paxDetails.adults} Adult${paxDetails.adults > 1 ? "s" : ""}`);
    if (paxDetails.children) parts.push(`${paxDetails.children} Child${paxDetails.children > 1 ? "ren" : ""}`);
    return parts.join(", ") || null;
  })();

  const hasAgency = !!(agencyName || agencyAdminName || agencyAdminEmail || agencyAdminPhone);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        {/* ── Fixed Header ── */}
        <SheetHeader className="px-5 pt-4 pb-3.5 border-b shrink-0 gap-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold">{travelerName}</SheetTitle>
            {paxLabel && <span className="text-xs text-muted-foreground border rounded px-2 py-0.5">{paxLabel}</span>}
            {shortQueryId && (
              <span className="text-xs text-info bg-info/10 font-mono font-semibold px-2 py-0.5 rounded shrink-0">
                {shortQueryId}
              </span>
            )}
          </div>

          {hasAgency && (
            <div className=" space-y-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Agency Details
              </span>
              <div className="flex items-center gap-4 flex-wrap">
                {agencyName && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5 shrink-0" />
                    {agencyName}
                  </span>
                )}
                {agencyAdminName && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5 shrink-0" />
                    {agencyAdminName}
                  </span>
                )}
                {agencyAdminPhone && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />+{agencyAdminPhone}
                  </span>
                )}
                {agencyAdminEmail && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {agencyAdminEmail}
                  </span>
                )}
              </div>
            </div>
          )}
        </SheetHeader>

        {/* ── Scrollable Body ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-4 space-y-3">
            {bookings.map((booking) => (
              <ServiceCard key={booking.id} booking={booking} defaultExpanded={expandSupplierContacts} />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-1">{children}</p>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: React.ElementType;
  label?: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      {label && <span className="text-muted-foreground shrink-0 min-w-[72px]">{label}</span>}
      <span className={cn("text-foreground font-medium break-words min-w-0 flex-1", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function PersonContactRow({
  icon: Icon,
  name,
  phone,
  whatsapp,
}: {
  icon: React.ElementType;
  name?: string;
  phone?: string;
  whatsapp?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      {name && (
        <span className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground">{name}</span>
        </span>
      )}
      {phone && (
        <>
          {name && <span className="text-muted-foreground/30">·</span>}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{phone}</span>
          </span>
        </>
      )}
      {whatsapp && whatsapp !== phone && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{whatsapp}</span>
          </span>
        </>
      )}
    </div>
  );
}

// ─── service card ─────────────────────────────────────────────────────────────

function ServiceCard({ booking, defaultExpanded }: { booking: AnyBooking; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const b = booking as any;

  // Resolve flat view fields (works for both BookingWithActivity and CalendarBooking)
  const serviceType: string = field<string>(b, "service_type", "activity.service_type") ?? "other";
  const serviceName: string =
    field<string>(b, "service_name") ??
    field<string>(b, "activity.hotel_name") ??
    field<string>(b, "activity.tour_name") ??
    field<string>(b, "activity.transfer_name") ??
    "Service";

  const supplierName = field<string>(b, "supplier_name");
  const currency = field<string>(b, "currency") ?? "";

  const bookingStatusCfg = getBookingStatusConfig(b.booking_status);
  const serviceTypeCfg = getServiceTypeConfig(serviceType);
  const paymentStatusVal = field<string>(b, "derived_payment_status", "payment_status") ?? "not_configured";
  const paymentStatusCfg = getPaymentStatusConfig(paymentStatusVal);
  const voucherStatusCfg = getVoucherStatusConfig(b.voucher_status);

  // ── dates ──
  const dateLabel = (() => {
    const checkIn = field<string>(b, "check_in_date");
    const checkOut = field<string>(b, "check_out_date");
    if (checkIn && checkOut) {
      return `${format(new Date(checkIn), "dd MMM")} – ${format(new Date(checkOut), "dd MMM yyyy")}`;
    }
    const tourDate = field<string>(b, "tour_date");
    if (tourDate) return format(new Date(tourDate), "dd MMM yyyy");
    const pickupDate = field<string>(b, "pickup_date");
    if (pickupDate) {
      const dropDate = field<string>(b, "drop_date");
      const drop = dropDate ? ` – ${format(new Date(dropDate), "dd MMM yyyy")}` : "";
      return format(new Date(pickupDate), "dd MMM yyyy") + drop;
    }
    const startDate = field<string>(b, "start_date");
    if (startDate) return format(new Date(startDate), "dd MMM yyyy");
    return null;
  })();

  const location = [field<string>(b, "service_city"), field<string>(b, "service_country")].filter(Boolean).join(", ");

  // ── free cancellation ──
  const freeCancelDate = field<string>(b, "free_cancellation_date");
  const freeCancelTime = field<string>(b, "free_cancellation_time");
  const freeCancellation = freeCancelDate
    ? `${format(new Date(freeCancelDate), "dd MMM yyyy")}${freeCancelTime ? ` · ${freeCancelTime}` : ""}`
    : null;

  // ── POC ──
  const pocs: any[] = Array.isArray(b.poc) ? b.poc : [];

  // ── detail flags ──
  const hasVehicle = !!(b.vehicle_brand || b.vehicle_type || b.vehicle_number);
  const hasDriver = !!(b.driver_name || b.driver_phone);
  const hasRestaurant = !!b.restaurant_name;
  const hasGuide = !!(b.guide_name || b.guide_phone);
  const hasOperational = !!(b.meeting_point || b.welcome_placard || b.notes);
  const hasBookingInfo = !!(
    b.confirmation_no ||
    b.reconfirmed_by ||
    (b.cost_price && b.cost_price > 0) ||
    freeCancellation
  );

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden border-l-[3px]", serviceTypeCfg.borderColor)}>
      {/* ── Card Header ── */}
      <div className="px-3.5 pt-2.5 pb-2">
        {/* Service name + type + booking status */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-snug break-words">
              {serviceName}{" "}
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 border-0 rounded-sm align-middle",
                  serviceTypeCfg.bgColor,
                  serviceTypeCfg.color
                )}
              >
                {serviceTypeCfg.label}
              </Badge>
            </h4>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <span className="text-[10px] text-muted-foreground">Booking</span>
            <Badge
              className={cn(
                "text-[10px] px-1.5 py-0 border-0 rounded-sm",
                bookingStatusCfg.bgColor,
                bookingStatusCfg.color
              )}
            >
              {bookingStatusCfg.label}
            </Badge>
          </div>
        </div>

        {/* Date + Location + Supplier row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {dateLabel && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              {dateLabel}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </span>
          )}
          {supplierName && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              {supplierName}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <Separator />
      <div className="px-3.5 py-3 space-y-3">
        {/* ── Booking Info ── */}
        {hasBookingInfo && (
          <div>
            <SectionLabel>Booking Info</SectionLabel>
            <div className="space-y-1">
              {b.confirmation_no && <InfoRow icon={Hash} label="Conf. No" value={b.confirmation_no} mono />}
              {b.reconfirmed_by && <InfoRow icon={FileCheck} label="Reconfirmed" value={b.reconfirmed_by} />}
              {b.cost_price != null && b.cost_price > 0 && (
                <InfoRow
                  icon={CreditCard}
                  label="Cost"
                  value={`${currency} ${Number(b.cost_price).toLocaleString()}`}
                />
              )}
              {freeCancellation && <InfoRow icon={Calendar} label="Free cancel" value={freeCancellation} />}
            </div>
          </div>
        )}

        {/* ── Vehicle + Driver merged ── */}
        {(hasVehicle || hasDriver) && (
          <div>
            <SectionLabel>Vehicle &amp; Driver</SectionLabel>
            <div className="space-y-1">
              {(b.vehicle_brand || b.vehicle_type || b.vehicle_number) && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {(b.vehicle_brand || b.vehicle_type) && (
                    <span className="font-medium text-foreground capitalize">
                      {[b.vehicle_brand, b.vehicle_type, b.vehicle_category].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {b.vehicle_number && (
                    <>
                      {(b.vehicle_brand || b.vehicle_type) && <span className="text-muted-foreground/30">·</span>}
                      <span className="text-muted-foreground">Vehicle No.</span>
                      <span className="font-mono font-semibold text-foreground tracking-wide">{b.vehicle_number}</span>
                    </>
                  )}
                </div>
              )}
              {hasDriver && (
                <PersonContactRow
                  icon={UserRound}
                  name={b.driver_name}
                  phone={b.driver_phone}
                  whatsapp={b.driver_whatsapp}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Guide ── */}
        {hasGuide && (
          <div>
            <SectionLabel>Guide</SectionLabel>
            <PersonContactRow icon={BookUser} name={b.guide_name} phone={b.guide_phone} whatsapp={b.guide_whatsapp} />
          </div>
        )}

        {/* ── Restaurant ── */}
        {hasRestaurant && (
          <div>
            <SectionLabel>Restaurant</SectionLabel>
            <div className="space-y-1">
              {/* Restaurant name row */}
              <div className="flex items-center gap-2 text-xs">
                <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground">{b.restaurant_name}</span>
              </div>
              {/* Contact inline — consistent with driver/guide */}
              {(b.restaurant_poc_name || b.restaurant_phone) && (
                <PersonContactRow icon={UserRound} name={b.restaurant_poc_name} phone={b.restaurant_phone} />
              )}
            </div>
          </div>
        )}

        {/* ── Operational Details ── */}
        {hasOperational && (
          <div>
            <SectionLabel>Operational</SectionLabel>
            <div className="space-y-1">
              {b.meeting_point && <InfoRow icon={MapPin} label="Meeting pt." value={b.meeting_point} />}
              {b.welcome_placard && <InfoRow icon={Info} label="Placard" value={b.welcome_placard} />}
              {b.notes && <InfoRow icon={Info} label="Notes" value={b.notes} />}
            </div>
          </div>
        )}
      </div>

      {/* ── Status strip + toggle ── */}
      <div className="px-3.5 py-1 bg-muted/30 border-t flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground">Voucher</span>
        <Badge
          className={cn(
            "text-[10px] px-1.5 py-0 border-0 rounded-sm",
            voucherStatusCfg.bgColor,
            voucherStatusCfg.color
          )}
        >
          {voucherStatusCfg.label}
        </Badge>
        <span className="text-muted-foreground/30 text-xs">·</span>
        <span className="text-[10px] text-muted-foreground">Payment</span>
        <Badge
          className={cn(
            "text-[10px] px-1.5 py-0 border-0 rounded-sm",
            paymentStatusCfg.bgColor,
            paymentStatusCfg.color
          )}
        >
          {paymentStatusCfg.label}
        </Badge>
        {pocs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto h-5 px-1.5 text-[10px] text-muted-foreground gap-0.5"
          >
            {expanded ? (
              <>
                <span>Hide Contacts</span>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <span>Supplier Contacts</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* ── Supplier POCs (expanded) ── */}
      {expanded && pocs.length > 0 && (
        <div className="px-3.5 py-3 border-t">
          <SectionLabel>Supplier Contacts</SectionLabel>
          <div className="space-y-3 divide-y mt-2">
            {pocs.map((poc: any, i: number) => (
              <div key={i} className="min-w-0 space-y-1.5 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-foreground">{poc.name}</span>
                  {poc.is_primary && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-primary/10 text-primary font-medium rounded-sm"
                    >
                      Primary
                    </Badge>
                  )}
                </div>
                {poc.department && poc.department.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(poc.department) ? poc.department : [poc.department]).map(
                      (dept: string, j: number) => (
                        <Badge key={j} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal rounded-sm">
                          {dept}
                        </Badge>
                      )
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {poc.phone && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Phone className="h-2.5 w-2.5 shrink-0" />
                      {poc.phone}
                    </span>
                  )}
                  {poc.email && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Mail className="h-2.5 w-2.5 shrink-0" />
                      {poc.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
