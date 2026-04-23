import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarProps {
  rating: number;
  maxStars?: number;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  fillColor?: string;
  emptyColor?: string;
}

const sizeMap = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-7 h-7",
};

export const RatingStar = ({
  rating,
  maxStars = 5,
  className,
  size = "md",
  fillColor = "fill-yellow-400 text-yellow-400",
  emptyColor = "text-muted-foreground",
}: RatingStarProps) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);
  const starSize = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={cn(starSize, fillColor)} />
      ))}

      {hasHalfStar && (
        <div className="relative">
          <Star className={cn(starSize, emptyColor, "stroke-1")} />
          <StarHalf className={cn("absolute left-0 top-0", starSize, fillColor)} />
        </div>
      )}

      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={cn(starSize, emptyColor, "stroke-1")} />
      ))}
    </div>
  );
};
