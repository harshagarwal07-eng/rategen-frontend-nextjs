"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RatingStar } from "@/components/common/RatingStars";
import Link from "next/link";
import { IoLogoWhatsapp } from "react-icons/io5";
import { HotelBookingCardProps, IHotelSearchCard } from "@/types/api-service";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Show from "@/components/ui/show";
import { MapPin, Wifi, Coffee, Utensils, Users, CheckCircle2 } from "lucide-react";
import { FaCar } from "react-icons/fa6";
import { StatusBadge } from "../shared/status-badge";

interface HotelSearchCardProps {
  hotelData: IHotelSearchCard;
  onClick?: () => void;
}

function HotelBookingCard(cardData: HotelBookingCardProps) {
  return (
    <Card
      className={cn("overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300", cardData.className)}
    >
      <div className="px-4">
        {/* Header Section */}
        <div className="flex gap-4 pb-3 border-b">
          {/* Hotel Image */}
          <div className="relative w-24 h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
            <Image src={cardData.imageUrl} alt={cardData.hotelName} fill sizes="96px" className="object-cover" />
          </div>

          {/* Hotel Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{cardData.hotelName}</h3>
              <RatingStar rating={cardData.rating} />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{cardData.location}</span>
              <Link href="#" className="text-primary hover:underline whitespace-nowrap ml-1">
                See on Map
              </Link>
            </div>

            <div className="flex items-center gap-3 text-xs text-destructive">
              <span>
                <span className="font-medium">Voucher:</span> {cardData.lastVoucherDate}
              </span>
              <span>
                <span className="font-medium">Cancellation:</span> {cardData.lastCancellationDate}
              </span>
            </div>
            <StatusBadge status={cardData.status} />
          </div>

          {/* Booking Details Card */}
          <div className="shrink-0 px-3 py-2 h-fit">
            <div className="flex divide-x divide-primary/20 gap-3">
              <div className="space-y-0.5 pr-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Conf No</p>
                <p className="text-sm font-medium text-primary">{cardData.confirmationNumber}</p>
              </div>
              <div className="space-y-0.5 pr-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ref No</p>
                <p className="text-sm font-medium text-primary">{cardData.referenceNumber}</p>
              </div>
              <div className="space-y-0.5 pr-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Price</p>
                <p className="text-sm font-medium text-primary">₹{cardData.price.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid Section */}
        <div className="py-3 border-b">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[90px]">Lead Guest:</span>
              <span className="font-medium">{cardData.leadGuestName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[90px]">Booked On:</span>
              <span className="font-medium">{cardData.bookedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[90px]">Check-in:</span>
              <span className="font-medium">{cardData.checkInDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[90px]">Check-out:</span>
              <span className="font-medium">{cardData.checkOutDate}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions Section */}
        <div className="pt-3 flex justify-end items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-success text-success hover:bg-success hover:text-success-foreground"
            onClick={cardData.onWhatsApp}
          >
            <IoLogoWhatsapp className="size-4" />
            WhatsApp
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={cardData.onCancel}
          >
            Cancel Booking
          </Button>

          <Link href={`/bookings/hotels/my-bookings/${cardData.bookingId}`}>
            <Button size="sm">View Details</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function HotelSearchCard({ hotelData, onClick }: HotelSearchCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Card className="w-full overflow-hidden p-0 bg-card border-border/60 shadow-sm hover:shadow-md hover:border-border/80 hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="grid grid-cols-12 gap-4 p-4">
        {/* Image Section */}
        <div className="col-span-3">
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted min-h-[180px]">
            {!isLoaded && <Skeleton className="w-full h-full absolute" />}
            <Image
              src={hotelData.img}
              alt={hotelData.name}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              onLoad={() => setIsLoaded(true)}
              className={cn(
                "object-cover transition-all duration-500 group-hover:scale-105",
                isLoaded ? "opacity-100" : "opacity-0"
              )}
              priority={false}
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="col-span-7 flex flex-col gap-2.5">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold leading-tight">{hotelData.name}</h3>
              <RatingStar rating={hotelData.stars} />
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span>{hotelData.location}</span>
              <span className="text-xs">• {hotelData.distance}</span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{hotelData.description}</p>
          </div>

          {/* Features */}
          <div className="flex items-center gap-2 flex-wrap">
            <Show when={hotelData.features.freeCancellation}>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-success/10 text-success">
                <CheckCircle2 className="size-3" />
                <span>Free Cancellation</span>
              </div>
            </Show>

            <Show when={hotelData.features.freeWifi}>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-foreground">
                <Wifi className="size-3" />
                <span>Free WiFi</span>
              </div>
            </Show>

            <Show when={hotelData.features.breakfast}>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-foreground">
                <Coffee className="size-3" />
                <span>Breakfast Included</span>
              </div>
            </Show>

            <Show when={hotelData.features.restaurant}>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-foreground">
                <Utensils className="size-3" />
                <span>Restaurant</span>
              </div>
            </Show>

            <Show when={hotelData.features.parking}>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-foreground">
                <FaCar className="size-3" />
                <span>Parking</span>
              </div>
            </Show>
          </div>

          {/* Room Info & Reviews */}
          <div className="flex items-center gap-5 text-sm mt-auto">
            <div className="flex items-center gap-1.5">
              <Users className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                {hotelData.rooms.available} {hotelData.rooms.type} available
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm">
                {hotelData.reviews.score.toFixed(1)}
              </div>
              <div className="text-xs">
                <span className="font-medium">Excellent</span>
                <span className="text-muted-foreground"> • {hotelData.reviews.count} reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price & Action Section */}
        <div className="col-span-2 flex flex-col justify-between items-end">
          <div className="text-right space-y-0.5">
            {hotelData.price.original && (
              <p className="text-sm text-muted-foreground line-through">
                {hotelData.price.currency} {hotelData.price.original}
              </p>
            )}
            <p className="text-2xl font-semibold tracking-tight">
              {hotelData.price.currency} {hotelData.price.current}
            </p>
            <p className="text-xs text-muted-foreground">per night</p>
          </div>

          <Button size="default" className="w-full font-medium" onClick={onClick}>
            View Rooms
          </Button>
        </div>
      </div>
    </Card>
  );
}

export { HotelBookingCard };
