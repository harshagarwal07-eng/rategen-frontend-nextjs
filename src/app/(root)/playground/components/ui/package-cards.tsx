"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hotel, MapPin, Users, Calendar, Clock, Car, Compass, Package } from "lucide-react";
import type {
  HotelCardProps,
  TourCardProps,
  TransferCardProps,
  ComboCardProps,
  PackageCardsProps,
} from "@/lib/agents/ui-components";

// =====================================================
// Hotel Card Component
// =====================================================

export function HotelCard({ hotel }: { hotel: HotelCardProps }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-muted">
          {hotel.image_url ? (
            <img
              src={hotel.image_url}
              alt={hotel.hotel_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Hotel className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate">{hotel.hotel_name}</h4>
                {hotel.star_rating && (
                  <span className="text-xs text-yellow-500">{"★".repeat(parseInt(hotel.star_rating) || 0)}</span>
                )}
              </div>
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
                {hotel.nights}N
              </Badge>
            </div>

            {/* Details */}
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-muted-foreground truncate">{hotel.room_category}</p>
              {hotel.meal_plan && (
                <p className="text-xs text-muted-foreground">{hotel.meal_plan}</p>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {hotel.currency} {hotel.rate_per_night}/night
            </span>
            <span className="font-semibold text-sm">
              {hotel.currency} {hotel.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Tour Card Component
// =====================================================

export function TourCard({ tour }: { tour: TourCardProps }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-muted">
          {tour.image_url ? (
            <img
              src={tour.image_url}
              alt={tour.tour_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Compass className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate">{tour.tour_name}</h4>
                {tour.package_name && tour.package_name !== tour.tour_name && (
                  <p className="text-xs text-muted-foreground truncate">{tour.package_name}</p>
                )}
              </div>
              {tour.date && (
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {tour.date}
                </Badge>
              )}
            </div>

            {/* Details */}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {tour.participants} pax
              </span>
              {tour.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tour.duration}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {tour.currency} {tour.rate_per_person}/person
            </span>
            <span className="font-semibold text-sm">
              {tour.currency} {tour.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Transfer Card Component
// =====================================================

export function TransferCard({ transfer }: { transfer: TransferCardProps }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-muted">
          {transfer.image_url ? (
            <img
              src={transfer.image_url}
              alt={transfer.transfer_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate">{transfer.transfer_name}</h4>
                {transfer.route && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {transfer.route}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="flex-shrink-0 text-xs">
                {transfer.transfer_type}
              </Badge>
            </div>

            {/* Details */}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {transfer.passengers} pax
              </span>
              {transfer.vehicle_type && (
                <span>{transfer.vehicle_type}</span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {transfer.transfer_type === "SIC" ? "per person" : "per vehicle"}
            </span>
            <span className="font-semibold text-sm">
              {transfer.currency} {transfer.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Combo Card Component
// =====================================================

export function ComboCard({ combo }: { combo: ComboCardProps }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-muted">
          {combo.image_url ? (
            <img
              src={combo.image_url}
              alt={combo.combo_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate">{combo.combo_name}</h4>
                <Badge variant="secondary" className="text-xs mt-1">Combo Package</Badge>
              </div>
              {combo.date && (
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {combo.date}
                </Badge>
              )}
            </div>

            {/* Included items */}
            {combo.included_items.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground truncate">
                  Includes: {combo.included_items.slice(0, 2).join(", ")}
                  {combo.included_items.length > 2 && ` +${combo.included_items.length - 2} more`}
                </p>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end justify-between mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {combo.participants} pax
            </span>
            <span className="font-semibold text-sm">
              {combo.currency} {combo.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Package Cards Container - Groups all package cards
// =====================================================

export function PackageCards({ packages }: { packages: PackageCardsProps }) {
  const { hotels, tours, transfers, combos, currency, grand_total } = packages;

  const hasHotels = hotels.length > 0;
  const hasTours = tours.length > 0;
  const hasTransfers = transfers.length > 0;
  const hasCombos = combos.length > 0;

  if (!hasHotels && !hasTours && !hasTransfers && !hasCombos) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Hotels Section */}
      {hasHotels && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Hotel className="w-4 h-4" />
            Accommodation
          </h3>
          <div className="grid gap-2">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        </div>
      )}

      {/* Tours Section */}
      {hasTours && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Tours & Activities
          </h3>
          <div className="grid gap-2">
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </div>
      )}

      {/* Combos Section */}
      {hasCombos && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Combo Packages
          </h3>
          <div className="grid gap-2">
            {combos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        </div>
      )}

      {/* Transfers Section */}
      {hasTransfers && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Car className="w-4 h-4" />
            Transfers
          </h3>
          <div className="grid gap-2">
            {transfers.map((transfer) => (
              <TransferCard key={transfer.id} transfer={transfer} />
            ))}
          </div>
        </div>
      )}

      {/* Grand Total */}
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Grand Total</span>
          <span className="text-lg font-bold">
            {currency} {grand_total.toLocaleString()}
          </span>
        </div>
      </Card>
    </div>
  );
}

export default PackageCards;
