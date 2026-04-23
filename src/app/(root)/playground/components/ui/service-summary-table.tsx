"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ServiceHoverLink } from "./service-hover-link";
import type { ServiceCardV2Data } from "./service-card-v2";
import { cn } from "@/lib/utils";
import S3Image from "@/components/ui/s3-image";
import { ImageIcon } from "lucide-react";

// =====================================================
// SERVICE SUMMARY TABLE
// Table with hover cards on service names
// Used for Tours, Transfers, Hotels, Meals summaries
// =====================================================

export interface ServiceSummaryItem {
  name: string;
  cardData: ServiceCardV2Data;
  quantity?: string;
  unitPrice?: number;
  total?: number;
  details?: string;
  image_url?: string;
}

export interface ServiceSummaryTableProps {
  title: string;
  items: ServiceSummaryItem[];
  currency?: string;
  showPricing?: boolean;
  className?: string;
}

/**
 * ServiceSummaryTable - Table with hoverable service names
 * Service names show detailed card popover on hover
 */
export function ServiceSummaryTable({
  title,
  items,
  currency = "USD",
  showPricing = true,
  className,
}: ServiceSummaryTableProps) {
  if (!items || items.length === 0) return null;

  // Determine columns based on data
  const hasQuantity = items.some((item) => item.quantity);
  const hasUnitPrice = showPricing && items.some((item) => item.unitPrice !== undefined);
  const hasTotal = showPricing && items.some((item) => item.total !== undefined);
  const hasDetails = items.some((item) => item.details);
  const hasImages = items.some((item) => item.image_url || item.cardData?.image_url);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            {hasImages && <TableHead className="font-medium w-14"></TableHead>}
            <TableHead className="font-medium">Service</TableHead>
            {hasDetails && <TableHead className="font-medium">Details</TableHead>}
            {hasQuantity && <TableHead className="font-medium text-center">Qty</TableHead>}
            {hasUnitPrice && <TableHead className="font-medium text-right">Unit Price</TableHead>}
            {hasTotal && <TableHead className="font-medium text-right">Total</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const imageUrl = item.image_url || item.cardData?.image_url;
            return (
              <TableRow key={index} className="hover:bg-muted/20">
                {hasImages && (
                  <TableCell className="w-14 p-2">
                    {imageUrl ? (
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted relative">
                        <S3Image url={imageUrl} alt={item.name} className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <ServiceHoverLink data={item.cardData}>{item.name}</ServiceHoverLink>
                </TableCell>
                {hasDetails && (
                  <TableCell className="text-sm text-muted-foreground">{item.details || "-"}</TableCell>
                )}
                {hasQuantity && (
                  <TableCell className="text-center text-sm">{item.quantity || "-"}</TableCell>
                )}
                {hasUnitPrice && (
                  <TableCell className="text-right text-sm">
                    {item.unitPrice !== undefined
                      ? `${currency} ${item.unitPrice.toLocaleString()}`
                      : "-"}
                  </TableCell>
                )}
                {hasTotal && (
                  <TableCell className="text-right font-medium">
                    {item.total !== undefined
                      ? `${currency} ${item.total.toLocaleString()}`
                      : "-"}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// =====================================================
// CATEGORY-SPECIFIC TABLES
// =====================================================

export interface TourSummaryItem {
  tour_name: string;
  package_name?: string;
  participants?: number;
  unit_price?: number;
  total?: number;
  duration?: string;
  image_url?: string;
  rating?: number;
  review_count?: number;
  location?: string;
  description?: string;
}

export function ToursSummaryTable({
  tours,
  currency = "USD",
  showPricing = true,
  className,
}: {
  tours: TourSummaryItem[];
  currency?: string;
  showPricing?: boolean;
  className?: string;
}) {
  const items: ServiceSummaryItem[] = tours.map((tour) => ({
    name: tour.tour_name,
    image_url: tour.image_url,
    cardData: {
      type: "tour" as const,
      name: tour.tour_name,
      subtitle: tour.package_name,
      description: tour.description,
      image_url: tour.image_url,
      rating: tour.rating,
      review_count: tour.review_count,
      location: tour.location,
      price: tour.total,
      currency,
      showPricing,
      duration: tour.duration,
      participants: tour.participants,
    },
    quantity: tour.participants ? `${tour.participants} pax` : undefined,
    unitPrice: tour.unit_price,
    total: tour.total,
    details: tour.package_name,
  }));

  return (
    <ServiceSummaryTable
      title="Tours Summary"
      items={items}
      currency={currency}
      showPricing={showPricing}
      className={className}
    />
  );
}

export interface TransferSummaryItem {
  transfer_name: string;
  transfer_type?: string;
  vehicle?: string;
  route?: string;
  passengers?: number;
  unit_price?: number;
  total?: number;
  image_url?: string;
}

export function TransfersSummaryTable({
  transfers,
  currency = "USD",
  showPricing = true,
  className,
}: {
  transfers: TransferSummaryItem[];
  currency?: string;
  showPricing?: boolean;
  className?: string;
}) {
  const items: ServiceSummaryItem[] = transfers.map((transfer) => ({
    name: transfer.transfer_name,
    image_url: transfer.image_url,
    cardData: {
      type: "transfer" as const,
      name: transfer.transfer_name,
      subtitle: transfer.transfer_type,
      location: transfer.route,
      image_url: transfer.image_url,
      price: transfer.total,
      currency,
      showPricing,
      transfer_type: transfer.transfer_type,
      vehicle: transfer.vehicle,
      participants: transfer.passengers,
    },
    quantity: transfer.passengers ? `${transfer.passengers} pax` : undefined,
    unitPrice: transfer.unit_price,
    total: transfer.total,
    details: `${transfer.transfer_type || ""} ${transfer.vehicle ? `- ${transfer.vehicle}` : ""}`.trim(),
  }));

  return (
    <ServiceSummaryTable
      title="Transfers Summary"
      items={items}
      currency={currency}
      showPricing={showPricing}
      className={className}
    />
  );
}

export interface HotelSummaryItem {
  hotel_name: string;
  room_type?: string;
  meal_plan?: string;
  nights?: number;
  rate_per_night?: number;
  total?: number;
  stars?: number;
  image_url?: string;
  location?: string;
  rating?: number;
  review_count?: number;
}

export function HotelsSummaryTable({
  hotels,
  currency = "USD",
  showPricing = true,
  className,
}: {
  hotels: HotelSummaryItem[];
  currency?: string;
  showPricing?: boolean;
  className?: string;
}) {
  const items: ServiceSummaryItem[] = hotels.map((hotel) => ({
    name: hotel.hotel_name,
    image_url: hotel.image_url,
    cardData: {
      type: "hotel" as const,
      name: hotel.hotel_name,
      subtitle: hotel.room_type,
      location: hotel.location,
      image_url: hotel.image_url,
      rating: hotel.rating || hotel.stars,
      review_count: hotel.review_count,
      price: hotel.total,
      currency,
      showPricing,
      room_type: hotel.room_type,
      meal_plan: hotel.meal_plan,
    },
    quantity: hotel.nights ? `${hotel.nights} nights` : undefined,
    unitPrice: hotel.rate_per_night,
    total: hotel.total,
    details: `${hotel.room_type || ""} ${hotel.meal_plan ? `(${hotel.meal_plan})` : ""}`.trim(),
  }));

  return (
    <ServiceSummaryTable
      title="Accommodation Summary"
      items={items}
      currency={currency}
      showPricing={showPricing}
      className={className}
    />
  );
}

export interface MealSummaryItem {
  meal_name: string;
  meal_type?: string;
  participants?: number;
  unit_price?: number;
  total?: number;
  image_url?: string;
  location?: string;
}

export function MealsSummaryTable({
  meals,
  currency = "USD",
  showPricing = true,
  className,
}: {
  meals: MealSummaryItem[];
  currency?: string;
  showPricing?: boolean;
  className?: string;
}) {
  const items: ServiceSummaryItem[] = meals.map((meal) => ({
    name: meal.meal_name,
    image_url: meal.image_url,
    cardData: {
      type: "meal" as const,
      name: meal.meal_name,
      subtitle: meal.meal_type,
      location: meal.location,
      image_url: meal.image_url,
      price: meal.total,
      currency,
      showPricing,
    },
    quantity: meal.participants ? `${meal.participants} pax` : undefined,
    unitPrice: meal.unit_price,
    total: meal.total,
    details: meal.meal_type,
  }));

  return (
    <ServiceSummaryTable
      title="Meals & Dining Summary"
      items={items}
      currency={currency}
      showPricing={showPricing}
      className={className}
    />
  );
}

export default ServiceSummaryTable;
