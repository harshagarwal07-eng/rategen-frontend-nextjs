"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Car,
  Hotel,
  Compass,
  Package,
  Sparkles,
  UtensilsCrossed,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// =====================================================
// ACTIVITY CARD - Hero image style (based on reference)
// Large image at top, details below
// =====================================================

export interface ActivityCardData {
  type: "tour" | "hotel" | "transfer" | "combo" | "meal" | "activity";
  id?: string;
  name: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  price?: number;
  currency?: string;
  showPricing?: boolean;
  // Details
  duration?: string;
  participants?: number;
  location?: string;
  date?: string;
  // Type-specific
  transfer_type?: string;
  vehicle?: string;
  room_type?: string;
  meal_plan?: string;
}

// Placeholder images - gradient backgrounds with icons
const placeholderGradients: Record<string, string> = {
  tour: "from-emerald-400 to-teal-600",
  hotel: "from-blue-400 to-indigo-600",
  transfer: "from-orange-400 to-red-500",
  combo: "from-purple-400 to-pink-600",
  meal: "from-rose-400 to-pink-500",
  activity: "from-teal-400 to-cyan-600",
};

const typeIcons: Record<string, any> = {
  tour: Compass,
  hotel: Hotel,
  transfer: Car,
  combo: Package,
  meal: UtensilsCrossed,
  activity: Sparkles,
};

const typeLabels: Record<string, string> = {
  tour: "Tour",
  hotel: "Accommodation",
  transfer: "Transfer",
  combo: "Package",
  meal: "Meal",
  activity: "Activity",
};

/**
 * Compact Activity Card - Shows in grid/list
 */
export function ActivityCard({
  data,
  onClick,
}: {
  data: ActivityCardData;
  onClick?: () => void;
}) {
  const Icon = typeIcons[data.type] || Compass;
  const hasImage = !!data.image_url;
  const showPrice = data.showPricing !== false && data.price !== undefined;
  const gradient = placeholderGradients[data.type];

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer group",
        "hover:shadow-lg transition-all duration-300",
        "border-0 bg-card"
      )}
      onClick={onClick}
    >
      {/* Hero Image */}
      <div className="relative h-32 md:h-40 w-full overflow-hidden">
        {hasImage ? (
          <Image
            src={data.image_url!}
            alt={data.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 300px"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              gradient
            )}
          >
            <Icon className="w-12 h-12 text-white/80" />
          </div>
        )}

        {/* Price overlay */}
        {showPrice && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="text-white font-semibold text-sm">
              From {data.currency || "USD"} {data.price?.toLocaleString()}
            </span>
          </div>
        )}

        {/* Type badge */}
        <Badge
          className={cn(
            "absolute top-2 left-2 text-xs",
            data.type === "tour" && "bg-emerald-500",
            data.type === "hotel" && "bg-blue-500",
            data.type === "transfer" && "bg-orange-500",
            data.type === "combo" && "bg-purple-500"
          )}
        >
          {typeLabels[data.type]}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {data.name}
        </h4>

        {/* Subtitle/Location */}
        {(data.subtitle || data.location) && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {data.subtitle || data.location}
          </p>
        )}

        {/* Details row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {data.participants !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {data.participants}
            </span>
          )}
          {data.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {data.duration}
            </span>
          )}
          {data.date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {data.date}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Activity Detail Card - Expanded view with description
 */
export function ActivityDetailCard({
  data,
  onClose,
}: {
  data: ActivityCardData;
  onClose?: () => void;
}) {
  const Icon = typeIcons[data.type] || Compass;
  const hasImage = !!data.image_url;
  const showPrice = data.showPricing !== false && data.price !== undefined;
  const gradient = placeholderGradients[data.type];

  return (
    <Card className="overflow-hidden border-0 shadow-xl max-w-sm">
      {/* Hero Image */}
      <div className="relative h-48 w-full">
        {hasImage ? (
          <Image
            src={data.image_url!}
            alt={data.name}
            fill
            className="object-cover"
            sizes="400px"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              gradient
            )}
          >
            <Icon className="w-16 h-16 text-white/80" />
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-bold text-lg">{data.name}</h3>

        {/* Subtitle */}
        {data.subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{data.subtitle}</p>
        )}

        {/* Duration/Type badge */}
        {(data.duration || data.transfer_type) && (
          <p className="text-xs text-muted-foreground mt-1">
            {data.duration || data.transfer_type}
          </p>
        )}

        {/* Description */}
        {data.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Price */}
        {showPrice && (
          <div className="mt-4 pt-3 border-t">
            <span className="text-lg font-bold text-primary">
              {data.currency || "USD"} {data.price?.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground ml-1">total</span>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Trip Highlights Section - Grid of activity cards
 */
export function TripHighlights({
  activities,
  title = "Trip Highlights",
  showPricing = true,
  currency = "USD",
}: {
  activities: ActivityCardData[];
  title?: string;
  showPricing?: boolean;
  currency?: string;
}) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityCardData | null>(null);

  if (!activities || activities.length === 0) return null;

  // Apply global settings to activities
  const processedActivities = activities.map((a) => ({
    ...a,
    showPricing,
    currency: a.currency || currency,
  }));

  return (
    <div className="mt-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <span className="text-sm text-muted-foreground">
          {activities.length} {activities.length === 1 ? "activity" : "activities"}
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {processedActivities.map((activity, index) => (
          <ActivityCard
            key={activity.id || `${activity.type}-${index}`}
            data={activity}
            onClick={() => setSelectedActivity(activity)}
          />
        ))}
      </div>

      {/* Detail Modal/Overlay */}
      {selectedActivity && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedActivity(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ActivityDetailCard
              data={selectedActivity}
              onClose={() => setSelectedActivity(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityCard;
